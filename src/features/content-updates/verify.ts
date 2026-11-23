import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

import type { ContentSource } from './config';

/** Pure checks for downloaded content. Everything here throws `ContentError` with a short reason. */
export class ContentError extends Error {}

/** Resolves `path` against the content root and refuses anything outside the allowed origins. */
export function contentUrl(source: ContentSource, path: string): string {
  const url = new URL(path, source.baseUrl);
  if (!source.allowedOrigins.includes(url.origin)) throw new ContentError(`Blocked origin ${url.origin}`);
  if (!url.href.startsWith(source.baseUrl)) throw new ContentError(`Blocked path ${path}`);
  return url.href;
}

export function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

export function checkFile(bytes: Uint8Array, expected: { sha256: string; bytes: number }, what: string): void {
  if (bytes.length !== expected.bytes) throw new ContentError(`${what}: ${bytes.length} bytes, expected ${expected.bytes}`);
  if (sha256Hex(bytes) !== expected.sha256) throw new ContentError(`${what}: checksum mismatch`);
}

/** The manifest signature file holds the 64-byte Ed25519 signature as hex. */
export function checkSignature(message: Uint8Array, signatureFile: Uint8Array, publicKeyHex: string): void {
  if (!/^[0-9a-f]{64}$/.test(publicKeyHex)) throw new ContentError('No content signing key configured');
  const sigHex = utf8(signatureFile).trim();
  if (!/^[0-9a-f]{128}$/.test(sigHex)) throw new ContentError('Malformed manifest signature');
  let ok = false;
  try {
    ok = ed25519.verify(hexToBytes(sigHex), message, hexToBytes(publicKeyHex));
  } catch {
    ok = false;
  }
  if (!ok) throw new ContentError('Manifest signature does not verify');
}

/**
 * Decodes UTF-8 without `TextDecoder`, which Hermes does not reliably provide. Malformed sequences throw, so a corrupt
 * file is rejected rather than half-read.
 */
export function utf8(bytes: Uint8Array): string {
  let out = '';
  let chunk: number[] = [];
  let i = 0;
  const cont = () => {
    const b = bytes[i++];
    if (b === undefined || (b & 0xc0) !== 0x80) throw new ContentError('Invalid UTF-8');
    return b & 0x3f;
  };
  while (i < bytes.length) {
    const b = bytes[i++]!;
    let cp: number;
    if (b < 0x80) cp = b;
    else if (b >= 0xc2 && b < 0xe0) cp = ((b & 0x1f) << 6) | cont();
    else if (b >= 0xe0 && b < 0xf0) cp = ((b & 0x0f) << 12) | (cont() << 6) | cont();
    else if (b >= 0xf0 && b < 0xf5) cp = ((b & 0x07) << 18) | (cont() << 12) | (cont() << 6) | cont();
    else throw new ContentError('Invalid UTF-8');
    if (cp > 0x10ffff || (cp >= 0xd800 && cp < 0xe000)) throw new ContentError('Invalid UTF-8');
    chunk.push(cp);
    if (chunk.length === 4096) {
      out += String.fromCodePoint(...chunk);
      chunk = [];
    }
  }
  return out + String.fromCodePoint(...chunk);
}

export function parseJson(bytes: Uint8Array, what: string): unknown {
  try {
    return JSON.parse(utf8(bytes));
  } catch {
    throw new ContentError(`${what}: not JSON`);
  }
}

/** -1, 0 or 1 for "x.y.z" versions; anything unparsable counts as 0.0.0. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => (/^\d+\.\d+\.\d+$/.test(v) ? v.split('.').map(Number) : [0, 0, 0]);
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (pa[i]! !== pb[i]!) return pa[i]! < pb[i]! ? -1 : 1;
  return 0;
}

/** What the app already has, not counting the pack being installed (an older version of it is being replaced). */
export type ExistingContent = { themeIds: ReadonlySet<string>; pageIds: ReadonlySet<string> };

/**
 * A pack may bring one new theme and pages for that theme or any existing theme. It may never reuse an id the app
 * already has: saved artwork refers to page ids, and a pack must not change a bundled picture or another pack's.
 */
export function checkIds(pack: { themeId?: string; pages: readonly { id: string; themeId: string }[] }, existing: ExistingContent): void {
  if (pack.themeId !== undefined && existing.themeIds.has(pack.themeId)) throw new ContentError(`Theme ${pack.themeId} already exists`);
  const seen = new Set<string>();
  for (const p of pack.pages) {
    if (existing.pageIds.has(p.id) || seen.has(p.id)) throw new ContentError(`Page ${p.id} already exists`);
    seen.add(p.id);
    if (p.themeId !== pack.themeId && !existing.themeIds.has(p.themeId)) throw new ContentError(`Page ${p.id} has unknown theme ${p.themeId}`);
  }
}
