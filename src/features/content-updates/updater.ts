import { ColoringPage, Theme } from '../../content/schema/page';
import { Manifest, PackIndex, type ManifestPack } from '../../content/schema/pack';
import { validatePage } from '../../content/schema/validatePage';
import { listInstalledPacks, recordInstall, removeInstalledPack } from '../../persistence/contentRepository';
import type { SqlDatabase } from '../../persistence/sql';
import { LIMITS, type ContentSource } from './config';
import type { PackStore } from './packStore';
import { checkFile, checkIds, checkSignature, compareVersions, ContentError, contentUrl, parseJson } from './verify';

/** A downloaded pack ready for the registry (same shape as registry's InstalledPack). */
export type LoadedPack = { id: string; version: number; theme?: Theme; pages: ColoringPage[] };

/** Fetches at most `maxBytes` from `url`, or throws. */
export type FetchBytes = (url: string, maxBytes: number) => Promise<Uint8Array>;

export type UpdaterDeps = {
  db: SqlDatabase;
  store: PackStore;
  fetchBytes: FetchBytes;
  source: ContentSource;
  publicKeyHex: string;
  appVersion: string;
  /** The registry's view of ids already in use, leaving out `exceptPack` (the pack being upgraded). */
  existing: (exceptPack?: string) => { themeIds: ReadonlySet<string>; pageIds: ReadonlySet<string> };
  now?: () => number;
};

export type UpdateResult = { installed: LoadedPack[]; failed: { packId: string; reason: string }[] };

const PACK_FILE = 'pack.json';

/**
 * Reads every installed pack from disk (at launch, before the catalog shows). A pack whose files are missing or
 * unreadable is dropped from the database, so it downloads again on the next check; one bad pack never blocks the rest.
 * So is a pack that clashes with `bundled` ids: an app update now ships those pictures itself, and showing both would
 * duplicate them.
 */
export async function loadInstalledPacks(
  db: SqlDatabase,
  store: PackStore,
  bundled: { themeIds: ReadonlySet<string>; pageIds: ReadonlySet<string> },
): Promise<LoadedPack[]> {
  const rows = await listInstalledPacks(db);
  const packs: LoadedPack[] = [];
  const taken = { themeIds: new Set(bundled.themeIds), pageIds: new Set(bundled.pageIds) };
  for (const row of rows) {
    let pageIds: string[] = [];
    try {
      const index = PackIndex.parse(parseJson(await store.read(row.path, PACK_FILE), PACK_FILE));
      pageIds = index.pages.map((f) => f.id);
      const pages: ColoringPage[] = [];
      for (const f of index.pages) pages.push(ColoringPage.parse(parseJson(await store.read(row.path, f.path), f.path)));
      checkIds({ themeId: index.theme?.id, pages }, taken);
      if (index.theme) taken.themeIds.add(index.theme.id);
      for (const p of pages) taken.pageIds.add(p.id);
      packs.push({ id: index.id, version: index.version, theme: index.theme, pages });
    } catch (e) {
      if (__DEV__) console.warn(`Dropping pack ${row.packId}`, e instanceof Error ? e.message : e);
      await removeInstalledPack(db, row.packId, pageIds.filter((id) => !bundled.pageIds.has(id)));
      store.remove(row.path);
    }
  }
  store.collectGarbage(new Set(rows.filter((r) => packs.some((p) => p.id === r.packId)).map((r) => r.path)));
  return packs;
}

/**
 * One update check (docs/CONTENT_DELIVERY.md): fetch and verify the signed manifest, then download, verify and install
 * each pack that is new or newer and that this app version can show. `onInstalled` runs after each pack is safely on
 * disk and recorded, so the catalog can refresh while the rest download. Failures are per pack and never touch what is
 * already installed.
 */
export async function checkForUpdates(deps: UpdaterDeps, onInstalled: (pack: LoadedPack) => void): Promise<UpdateResult> {
  const result: UpdateResult = { installed: [], failed: [] };
  const manifestBytes = await deps.fetchBytes(contentUrl(deps.source, 'manifest.json'), LIMITS.manifestBytes);
  const signature = await deps.fetchBytes(contentUrl(deps.source, 'manifest.json.sig'), LIMITS.signatureBytes);
  checkSignature(manifestBytes, signature, deps.publicKeyHex);
  const manifest = Manifest.safeParse(parseJson(manifestBytes, 'manifest'));
  if (!manifest.success) throw new ContentError('Manifest does not match the schema');

  const current = new Map((await listInstalledPacks(deps.db)).map((r) => [r.packId, r]));
  const wanted = manifest.data.packs.filter(
    (p) => compareVersions(p.minAppVersion, deps.appVersion) <= 0 && (current.get(p.id)?.version ?? 0) < p.version,
  );
  for (const entry of wanted) {
    try {
      const pack = await installPack(deps, entry, current.get(entry.id));
      result.installed.push(pack);
      onInstalled(pack);
    } catch (e) {
      result.failed.push({ packId: entry.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}

async function installPack(deps: UpdaterDeps, entry: ManifestPack, previous: { path: string } | undefined): Promise<LoadedPack> {
  const indexBytes = await deps.fetchBytes(contentUrl(deps.source, entry.path), Math.min(entry.bytes, LIMITS.packIndexBytes));
  checkFile(indexBytes, entry, entry.path);
  const index = PackIndex.safeParse(parseJson(indexBytes, entry.path));
  if (!index.success) throw new ContentError(`${entry.path} does not match the schema`);
  if (index.data.id !== entry.id || index.data.version !== entry.version) throw new ContentError(`${entry.path} is for another pack`);
  const total = index.data.pages.reduce((n, f) => n + f.bytes, 0);
  if (total > LIMITS.packBytes) throw new ContentError(`Pack ${entry.id} is too big (${total} bytes)`);

  // Page files sit next to pack.json; their paths are relative to it.
  const packDir = entry.path.slice(0, entry.path.lastIndexOf('/') + 1);
  const files: { name: string; bytes: Uint8Array }[] = [{ name: PACK_FILE, bytes: indexBytes }];
  const pages: ColoringPage[] = [];
  for (const f of index.data.pages) {
    if (f.bytes > LIMITS.fileBytes) throw new ContentError(`${f.path} is too big`);
    const bytes = await deps.fetchBytes(contentUrl(deps.source, packDir + f.path), f.bytes);
    checkFile(bytes, f, f.path);
    const checked = validatePage(parseJson(bytes, f.path));
    if (!checked.ok) throw new ContentError(`${f.path}: ${checked.issues.find((i) => i.severity === 'error')?.message ?? 'invalid page'}`);
    if (checked.page.id !== f.id) throw new ContentError(`${f.path} holds page ${checked.page.id}, expected ${f.id}`);
    pages.push(checked.page);
    files.push({ name: f.path, bytes });
  }
  checkIds({ themeId: index.data.theme?.id, pages }, deps.existing(entry.id));

  const previousPageIds = previous ? (await loadPagesOf(deps.store, previous.path)).map((p) => p.id) : [];
  const path = await deps.store.install(entry.id, entry.version, files);
  await recordInstall(deps.db, { packId: entry.id, version: entry.version, path, pages, previousPageIds }, deps.now?.());
  if (previous && previous.path !== path) deps.store.remove(previous.path);
  return { id: entry.id, version: entry.version, theme: index.data.theme, pages };
}

async function loadPagesOf(store: PackStore, path: string): Promise<{ id: string }[]> {
  try {
    return PackIndex.parse(parseJson(await store.read(path, PACK_FILE), PACK_FILE)).pages;
  } catch {
    return [];
  }
}
