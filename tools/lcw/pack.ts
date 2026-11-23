// Content packs for the CDN (docs/CONTENT_DELIVERY.md).
//   npm run lcw -- pack keygen                                   one-time: signing key into the macOS Keychain
//   npm run lcw -- pack build <packId> --version 1 --theme <id>  a whole theme (new theme if listed in content/remote.json)
//   npm run lcw -- pack build <packId> --version 2 --pages a,b   extra pages for existing themes
//   npm run lcw -- pack manifest                                 writes + signs content/cdn/v1/manifest.json
//   npm run lcw -- pack serve [--port 8787]                      serves content/cdn for development builds
//   npm run lcw -- pack deploy                                   checks the signature, then deploys content/cdn to Firebase Hosting
// Built files go to content/cdn/v1/ (committed) and are never overwritten: a change is a new version.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';

import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

import { Manifest, PackId, PackIndex, type ManifestPack, type PackFile } from '../../src/content/schema/pack';
import { Theme, type ColoringPage } from '../../src/content/schema/page';
import { validatePage } from '../../src/content/schema/validatePage';
import { PUBLIC_KEY_HEX } from '../../src/features/content-updates/config';

const ROOT = resolve(__dirname, '../..');
const PAGES_DIR = join(ROOT, 'content/pages');
/** Published packs are kept in git: a Firebase deploy replaces the whole site with this folder. */
const OUT = join(ROOT, 'content/cdn');
const V1 = join(OUT, 'v1');
const KEYCHAIN = { service: 'little-color-world-content-signing', account: 'manifest' };
const CONFIG_FILE = 'src/features/content-updates/config.ts';

export class PackUsageError extends Error {}

type Flags = Record<string, string | boolean>;

export async function packCommand(command: string | undefined, args: string[], flags: Flags): Promise<number> {
  switch (command) {
    case 'keygen':
      return keygen(flags.force === true);
    case 'build':
      return build(args[0], flags);
    case 'manifest':
      return manifest();
    case 'serve':
      return serve(Number(typeof flags.port === 'string' ? flags.port : 8787));
    case 'deploy':
      return deploy(flags['dry-run'] === true);
    default:
      throw new PackUsageError('Unknown pack command (keygen | build | manifest | serve | deploy)');
  }
}

/**
 * Publishes content/cdn to Firebase Hosting (project in .firebaserc, headers in firebase.json). A deploy replaces the
 * whole site in one step, so the manifest and its packs always go live together. Before deploying, everything is
 * checked the way the app checks it: the manifest must be signed with the production key built into the app, and every
 * listed file must match its size and SHA-256. A dev-signed or broken site therefore never goes live.
 */
function deploy(dryRun: boolean): number {
  const manifestPath = join(V1, 'manifest.json');
  if (!existsSync(manifestPath)) throw new PackUsageError('No manifest yet (npm run lcw -- pack manifest)');
  if (!/^[0-9a-f]{64}$/.test(PUBLIC_KEY_HEX)) {
    throw new PackUsageError(`PUBLIC_KEY_HEX in ${CONFIG_FILE} is empty: run \`npm run lcw -- pack keygen\` and paste the public key first`);
  }
  const manifestBytes = readFileSync(manifestPath);
  const sig = readFileSync(join(V1, 'manifest.json.sig'), 'utf8').trim();
  if (!/^[0-9a-f]{128}$/.test(sig) || !ed25519.verify(hexToBytes(sig), manifestBytes, hexToBytes(PUBLIC_KEY_HEX))) {
    throw new PackUsageError('manifest.json is not signed with the production key (re-run `npm run lcw -- pack manifest` without LCW_SIGNING_KEY)');
  }
  const doc = Manifest.parse(JSON.parse(manifestBytes.toString('utf8')));
  let files = 2;
  for (const p of doc.packs) {
    const indexPath = join(V1, p.path);
    const indexText = readFileSync(indexPath, 'utf8');
    checkFingerprint(indexText, p, p.path);
    const index = PackIndex.parse(JSON.parse(indexText));
    for (const f of index.pages) checkFingerprint(readFileSync(join(indexPath, '..', f.path), 'utf8'), f, `${p.id}/${f.path}`);
    files += 1 + index.pages.length;
  }
  const summary = doc.packs.map((p) => `${p.id} v${p.version}`).join(', ') || 'no packs';
  console.log(`Checked ${files} files (${summary}); signature matches the app's production key.`);
  if (dryRun) {
    console.log('Dry run: nothing deployed.');
    return 0;
  }
  execFileSync('firebase', ['deploy', '--only', 'hosting', '--message', `Content: ${summary}`.slice(0, 250)], { cwd: ROOT, stdio: 'inherit' });
  return 0;
}

function checkFingerprint(text: string, expected: { sha256: string; bytes: number }, what: string): void {
  const actual = fingerprint(text);
  if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) throw new PackUsageError(`${what} does not match its checksum`);
}

function keygen(force: boolean): number {
  if (!force && readSigningKey(false)) {
    throw new PackUsageError('A signing key already exists in the Keychain. Replacing it means every installed app must update first (--force).');
  }
  const secret = ed25519.utils.randomPrivateKey();
  execFileSync('security', ['add-generic-password', '-U', '-s', KEYCHAIN.service, '-a', KEYCHAIN.account, '-w', bytesToHex(secret)]);
  console.log(`Saved the private key in the login Keychain ("${KEYCHAIN.service}").`);
  console.log(`Public key (put it in ${CONFIG_FILE} as PUBLIC_KEY_HEX):\n${bytesToHex(ed25519.getPublicKey(secret))}`);
  return 0;
}

/** `LCW_SIGNING_KEY` (hex) overrides the Keychain, e.g. for tests. */
function readSigningKey(required = true): Uint8Array | null {
  const fromEnv = process.env.LCW_SIGNING_KEY;
  if (fromEnv) return hexToBytes(fromEnv);
  try {
    const hex = execFileSync('security', ['find-generic-password', '-s', KEYCHAIN.service, '-a', KEYCHAIN.account, '-w'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return hexToBytes(hex);
  } catch {
    if (required) throw new PackUsageError('No signing key in the Keychain (run `npm run lcw -- pack keygen`)');
    return null;
  }
}

function build(packId: string | undefined, flags: Flags): number {
  if (!packId || !PackId.safeParse(packId).success) throw new PackUsageError('Pack id must be lowercase letters, digits and "-"');
  const version = Number(flags.version);
  if (!Number.isInteger(version) || version < 1) throw new PackUsageError('--version must be a whole number from 1');
  const minAppVersion = typeof flags['min-app'] === 'string' ? flags['min-app'] : '0.1.0';
  const themeId = typeof flags.theme === 'string' ? flags.theme : undefined;
  const pageIds = typeof flags.pages === 'string' ? flags.pages.split(',') : undefined;
  if (!themeId === !pageIds) throw new PackUsageError('Give exactly one of --theme <id> or --pages a,b');

  const dir = join(V1, 'packs', packId, String(version));
  if (existsSync(dir)) throw new PackUsageError(`${relative(ROOT, dir)} already exists. Published versions never change: use a new --version.`);

  const remote = JSON.parse(readFileSync(join(ROOT, 'content/remote.json'), 'utf8')) as { themes: string[]; pages: string[] };
  const themes = Theme.array().parse(JSON.parse(readFileSync(join(ROOT, 'content/themes.json'), 'utf8')));
  const all = readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(PAGES_DIR, f), 'utf8')) as { id: string; themeId: string });
  const chosen = themeId ? all.filter((p) => p.themeId === themeId) : pageIds!.map((id) => all.find((p) => p.id === id) ?? missing(id));
  if (chosen.length === 0) throw new PackUsageError(`No pages for theme ${themeId}`);

  // A theme listed in content/remote.json is not in the app bundle, so the pack brings it.
  let theme: Theme | undefined;
  if (themeId && remote.themes.includes(themeId)) {
    theme = themes.find((t) => t.id === themeId);
    if (!theme) throw new PackUsageError(`Theme ${themeId} is not in content/themes.json`);
  }
  const notRemote = chosen.filter((p) => !remote.themes.includes(p.themeId) && !remote.pages.includes(p.id));
  if (notRemote.length) {
    throw new PackUsageError(
      `These pages are also in the app bundle; add their theme or ids to content/remote.json first: ${notRemote.map((p) => p.id).join(', ')}`,
    );
  }

  const files: PackFile[] = [];
  const out: { path: string; text: string }[] = [];
  for (const raw of chosen) {
    const checked = validatePage(raw);
    if (!checked.ok) throw new PackUsageError(`${raw.id}: ${checked.issues.map((i) => i.message).join('; ')}`);
    const text = JSON.stringify(checked.page satisfies ColoringPage);
    const path = `pages/${raw.id}.json`;
    files.push({ id: raw.id, path, ...fingerprint(text) });
    out.push({ path, text });
  }
  const index: PackIndex = PackIndex.parse({ schemaVersion: 1, id: packId, version, ...(theme ? { theme } : {}), pages: files });
  mkdirSync(join(dir, 'pages'), { recursive: true });
  for (const f of out) writeFileSync(join(dir, f.path), f.text);
  writeFileSync(join(dir, 'pack.json'), JSON.stringify(index));
  // Not published to the app: build settings the manifest step reads.
  writeFileSync(join(dir, 'release.json'), JSON.stringify({ minAppVersion }));
  const total = files.reduce((n, f) => n + f.bytes, 0);
  console.log(`Built ${relative(ROOT, dir)}: ${files.length} pages, ${(total / 1024 / 1024).toFixed(1)} MB${theme ? `, new theme "${theme.title}"` : ''}`);
  console.log('Next: npm run lcw -- pack manifest');
  return 0;
}

function missing(id: string): never {
  throw new PackUsageError(`No page ${id} in content/pages`);
}

function fingerprint(text: string): { sha256: string; bytes: number } {
  const bytes = Buffer.from(text, 'utf8');
  return { sha256: bytesToHex(sha256(bytes)), bytes: bytes.length };
}

/** Lists the newest built version of every pack, then writes and signs the manifest. */
function manifest(): number {
  const packsDir = join(V1, 'packs');
  if (!existsSync(packsDir)) throw new PackUsageError('Nothing built yet (npm run lcw -- pack build …)');
  const packs: ManifestPack[] = [];
  for (const id of readdirSync(packsDir).sort()) {
    const versions = readdirSync(join(packsDir, id))
      .filter((v) => /^\d+$/.test(v))
      .map(Number)
      .sort((a, b) => b - a);
    const latest = versions[0];
    if (latest === undefined) continue;
    const dir = join(packsDir, id, String(latest));
    const text = readFileSync(join(dir, 'pack.json'), 'utf8');
    PackIndex.parse(JSON.parse(text));
    const { minAppVersion } = JSON.parse(readFileSync(join(dir, 'release.json'), 'utf8')) as { minAppVersion: string };
    packs.push({ id, version: latest, minAppVersion, path: `packs/${id}/${latest}/pack.json`, ...fingerprint(text) });
  }
  const doc: Manifest = Manifest.parse({ schemaVersion: 1, generatedAt: new Date().toISOString(), packs });
  const text = JSON.stringify(doc, null, 2);
  const signature = ed25519.sign(Buffer.from(text, 'utf8'), readSigningKey()!);
  writeFileSync(join(V1, 'manifest.json'), text);
  writeFileSync(join(V1, 'manifest.json.sig'), bytesToHex(signature));
  console.log(`Signed ${relative(ROOT, join(V1, 'manifest.json'))}: ${packs.map((p) => `${p.id} v${p.version}`).join(', ')}`);
  console.log('Upload every pack folder first and manifest.json + manifest.json.sig last (docs/CONTENT_DELIVERY.md).');
  return 0;
}

/** Development only: serves content/cdn on localhost (the app's DEV_CONTENT_BASE_URL). */
function serve(port: number): Promise<number> {
  const types: Record<string, string> = { '.json': 'application/json', '.sig': 'text/plain' };
  return new Promise(() => {
    createServer((req, res) => {
      const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!)).replace(/^(\.\.[/\\])+/, '');
      const file = join(OUT, path);
      if (!file.startsWith(OUT) || !existsSync(file) || file.endsWith('release.json')) {
        res.writeHead(404).end();
        return;
      }
      const body = readFileSync(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': body.length }).end(body);
      console.log(`${req.method} ${path} ${body.length}`);
    }).listen(port, '127.0.0.1', () => console.log(`Serving ${relative(ROOT, OUT)} at http://localhost:${port}/v1/`));
  });
}
