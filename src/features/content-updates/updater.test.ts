/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/hashes/utils';

import type { Theme } from '../../content/schema/page';
import { listInstalledPacks, loadNewBadges } from '../../persistence/contentRepository';
import { migrate } from '../../persistence/migrations';
import { openTestDatabase } from '../../test-utils/nodeSqlite';
import { contentSource } from './config';
import type { PackStore } from './packStore';
import { checkForUpdates, loadInstalledPacks, type LoadedPack, type UpdaterDeps } from './updater';
import { sha256Hex } from './verify';

const enc = (s: string) => new TextEncoder().encode(s);
const source = contentSource(false);
const BASE = source.baseUrl;
const secret = ed25519.utils.randomPrivateKey();
const publicKeyHex = bytesToHex(ed25519.getPublicKey(secret));

/** A real bundled page, re-labelled as a new picture in theme `themeId`. */
function page(id: string, themeId: string): object {
  const raw = JSON.parse(readFileSync(join(__dirname, '../../../content/pages/bloom-rose.json'), 'utf8')) as Record<string, unknown>;
  return { ...raw, id, themeId, title: id };
}

const garden: Theme = { id: 'garden', title: 'Garden', color: '#E2609A', emoji: '🌷', order: 20, hidden: false };

/** Builds a signed CDN the way `lcw pack build` + `pack manifest` do, as a url → bytes map. */
function cdn(packs: { id: string; version: number; theme?: Theme; pages: object[]; minAppVersion?: string }[]) {
  const files = new Map<string, Uint8Array>();
  const entries = packs.map((p) => {
    const dir = `packs/${p.id}/${p.version}/`;
    const pageFiles = p.pages.map((pg) => {
      const bytes = enc(JSON.stringify(pg));
      const path = `pages/${(pg as { id: string }).id}.json`;
      files.set(BASE + dir + path, bytes);
      return { id: (pg as { id: string }).id, path, sha256: sha256Hex(bytes), bytes: bytes.length };
    });
    const index = enc(JSON.stringify({ schemaVersion: 1, id: p.id, version: p.version, ...(p.theme ? { theme: p.theme } : {}), pages: pageFiles }));
    files.set(BASE + dir + 'pack.json', index);
    return { id: p.id, version: p.version, minAppVersion: p.minAppVersion ?? '0.1.0', path: dir + 'pack.json', sha256: sha256Hex(index), bytes: index.length };
  });
  const manifest = enc(JSON.stringify({ schemaVersion: 1, generatedAt: '2026-11-13T00:00:00Z', packs: entries }));
  files.set(BASE + 'manifest.json', manifest);
  files.set(BASE + 'manifest.json.sig', enc(bytesToHex(ed25519.sign(manifest, secret))));
  return files;
}

function memoryStore(): PackStore & { dirs: Map<string, Map<string, Uint8Array>> } {
  const dirs = new Map<string, Map<string, Uint8Array>>();
  return {
    dirs,
    async install(packId, version, files) {
      const path = `content/packs/${packId}/${version}`;
      dirs.set(path, new Map(files.map((f) => [f.name, f.bytes])));
      return path;
    },
    async read(path, name) {
      const bytes = dirs.get(path)?.get(name);
      if (!bytes) throw new Error(`missing ${path}/${name}`);
      return bytes;
    },
    remove(path) {
      dirs.delete(path);
    },
    collectGarbage(keep) {
      for (const k of [...dirs.keys()]) if (!keep.has(k)) dirs.delete(k);
    },
  };
}

async function setup(files: Map<string, Uint8Array>, overrides: Partial<UpdaterDeps> = {}) {
  const db = openTestDatabase();
  await migrate(db);
  const store = memoryStore();
  const fetched: string[] = [];
  const deps: UpdaterDeps = {
    db,
    store,
    source,
    publicKeyHex,
    appVersion: '0.1.0',
    existing: () => ({ themeIds: new Set(['flowers', 'animals']), pageIds: new Set(['bloom-rose']) }),
    now: () => 1000,
    fetchBytes: async (url, max) => {
      fetched.push(url);
      const b = files.get(url);
      if (!b) throw new Error(`404 ${url}`);
      if (b.length > max) throw new Error('too big');
      return b;
    },
    ...overrides,
  };
  return { db, store, deps, fetched };
}

describe('checkForUpdates', () => {
  it('installs a new theme pack and badges it', async () => {
    const files = cdn([{ id: 'garden', version: 1, theme: garden, pages: [page('garden-01', 'garden'), page('garden-02', 'garden')] }]);
    const { db, store, deps } = await setup(files);
    const seen: LoadedPack[] = [];
    const r = await checkForUpdates(deps, (p) => seen.push(p));
    expect(r.failed).toEqual([]);
    expect(seen.map((p) => [p.id, p.theme?.id, p.pages.map((x) => x.id)])).toEqual([['garden', 'garden', ['garden-01', 'garden-02']]]);
    expect((await listInstalledPacks(db)).map((x) => x.packId)).toEqual(['garden']);
    expect([...(await loadNewBadges(db, 2000)).themes.keys()]).toEqual(['garden']);
    // What the next launch reads back from disk.
    const loaded = await loadInstalledPacks(db, store, { themeIds: new Set(['flowers']), pageIds: new Set() });
    expect(loaded.map((p) => [p.id, p.pages.length])).toEqual([['garden', 2]]);
  });

  it('retires a pack at launch once an app update bundles the same pictures', async () => {
    const { db, store, deps } = await setup(cdn([{ id: 'garden', version: 1, theme: garden, pages: [page('garden-01', 'garden')] }]));
    await checkForUpdates(deps, () => {});
    const loaded = await loadInstalledPacks(db, store, { themeIds: new Set(['garden']), pageIds: new Set(['garden-01']) });
    expect(loaded).toEqual([]);
    expect(await listInstalledPacks(db)).toEqual([]);
    expect(store.dirs.size).toBe(0);
  });

  it('adds pages to an existing theme', async () => {
    const { deps } = await setup(cdn([{ id: 'more-flowers', version: 1, pages: [page('flower-99', 'flowers')] }]));
    const r = await checkForUpdates(deps, () => {});
    expect(r.installed.map((p) => p.pages[0]!.themeId)).toEqual(['flowers']);
  });

  it('does nothing when the manifest signature fails', async () => {
    const files = cdn([{ id: 'garden', version: 1, theme: garden, pages: [page('garden-01', 'garden')] }]);
    files.set(BASE + 'manifest.json.sig', enc(bytesToHex(ed25519.sign(enc('other'), secret))));
    const { db, deps, fetched } = await setup(files);
    await expect(checkForUpdates(deps, () => {})).rejects.toThrow(/signature/);
    expect(fetched).toEqual([BASE + 'manifest.json', BASE + 'manifest.json.sig']);
    expect(await listInstalledPacks(db)).toEqual([]);
  });

  it('rejects a pack whose page was changed after publishing, and installs the rest', async () => {
    const files = cdn([
      { id: 'garden', version: 1, theme: garden, pages: [page('garden-01', 'garden')] },
      { id: 'more-flowers', version: 1, pages: [page('flower-99', 'flowers')] },
    ]);
    // Same length, one character different: only the checksum can catch it.
    const tampered = JSON.stringify(page('garden-01', 'garden')).replace('"title":"garden-01"', '"title":"garden-0X"');
    files.set(BASE + 'packs/garden/1/pages/garden-01.json', enc(tampered));
    const { db, store, deps } = await setup(files);
    const r = await checkForUpdates(deps, () => {});
    expect(r.failed).toEqual([{ packId: 'garden', reason: 'pages/garden-01.json: checksum mismatch' }]);
    expect(r.installed.map((p) => p.id)).toEqual(['more-flowers']);
    expect((await listInstalledPacks(db)).map((x) => x.packId)).toEqual(['more-flowers']);
    expect([...store.dirs.keys()]).toEqual(['content/packs/more-flowers/1']);
  });

  it('refuses ids the app already has', async () => {
    const { deps } = await setup(cdn([{ id: 'dupe', version: 1, pages: [page('bloom-rose', 'flowers')] }]));
    const r = await checkForUpdates(deps, () => {});
    expect(r.failed[0]?.reason).toMatch(/already exists/);
  });

  it('refuses a page that fails the geometry check', async () => {
    const broken = { ...page('flower-98', 'flowers'), regions: [{ id: 'part-1', d: 'M 0 0 L 10 0' }] };
    const { deps } = await setup(cdn([{ id: 'bad', version: 1, pages: [broken] }]));
    const r = await checkForUpdates(deps, () => {});
    expect(r.failed).toHaveLength(1);
    expect(r.installed).toEqual([]);
  });

  it('skips packs that need a newer app, and packs already installed', async () => {
    const files = cdn([
      { id: 'future', version: 1, minAppVersion: '9.0.0', pages: [page('flower-97', 'flowers')] },
      { id: 'more-flowers', version: 1, pages: [page('flower-99', 'flowers')] },
    ]);
    const { deps, fetched } = await setup(files);
    await checkForUpdates(deps, () => {});
    expect(fetched.some((u) => u.includes('future'))).toBe(false);
    fetched.length = 0;
    const again = await checkForUpdates(deps, () => {});
    expect(again.installed).toEqual([]);
    expect(fetched).toEqual([BASE + 'manifest.json', BASE + 'manifest.json.sig']);
  });

  it('upgrades a pack in place and removes the old version', async () => {
    const v1 = cdn([{ id: 'garden', version: 1, theme: garden, pages: [page('garden-01', 'garden')] }]);
    const { db, store, deps } = await setup(v1);
    await checkForUpdates(deps, () => {});
    const v2 = cdn([{ id: 'garden', version: 2, theme: garden, pages: [page('garden-01', 'garden'), page('garden-02', 'garden')] }]);
    // The pack being upgraded does not count as "already existing".
    const r = await checkForUpdates({ ...deps, fetchBytes: async (url) => v2.get(url) ?? Promise.reject(new Error(url)), now: () => 5000 }, () => {});
    expect(r.installed.map((p) => p.version)).toEqual([2]);
    expect([...store.dirs.keys()]).toEqual(['content/packs/garden/2']);
    expect([...(await loadNewBadges(db, 5001)).pages].sort()).toEqual(['garden-01', 'garden-02']);
  });
});
