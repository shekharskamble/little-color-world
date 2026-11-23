import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/hashes/utils';

import { contentSource } from './config';
import { checkFile, checkIds, checkSignature, compareVersions, ContentError, contentUrl, sha256Hex, utf8 } from './verify';

const enc = (s: string) => new TextEncoder().encode(s);

describe('contentUrl', () => {
  const prod = contentSource(false);
  it('resolves paths under the content root', () => {
    expect(contentUrl(prod, 'packs/flowers/1/pack.json')).toBe('https://littlecolorworld-content.web.app/v1/packs/flowers/1/pack.json');
  });
  it('refuses other hosts, plain http and paths that climb out', () => {
    expect(() => contentUrl(prod, 'https://evil.example/x.json')).toThrow(ContentError);
    expect(() => contentUrl(prod, 'http://littlecolorworld-content.web.app/v1/x.json')).toThrow(ContentError);
    expect(() => contentUrl(prod, '../v2/manifest.json')).toThrow(ContentError);
    expect(() => contentUrl(prod, '//evil.example/x')).toThrow(ContentError);
  });
  it('only lets development builds use localhost', () => {
    expect(contentUrl(contentSource(true), 'manifest.json')).toBe('http://localhost:8787/v1/manifest.json');
    expect(() => contentUrl(prod, 'http://localhost:8787/v1/manifest.json')).toThrow(ContentError);
  });
});

describe('utf8', () => {
  it('decodes like TextDecoder, including emoji', () => {
    const s = 'Flowers 🌷 — "Daisy" é ü 中';
    expect(utf8(enc(s))).toBe(s);
    const long = 'x'.repeat(10_000) + '🌷';
    expect(utf8(enc(long))).toBe(long);
  });
  it('rejects malformed bytes', () => {
    expect(() => utf8(new Uint8Array([0xc3]))).toThrow(ContentError);
    expect(() => utf8(new Uint8Array([0xff]))).toThrow(ContentError);
    expect(() => utf8(new Uint8Array([0xed, 0xa0, 0x80]))).toThrow(ContentError); // a lone surrogate
  });
});

describe('checkFile', () => {
  const bytes = enc('{"a":1}');
  it('accepts matching size and checksum', () => {
    expect(() => checkFile(bytes, { sha256: sha256Hex(bytes), bytes: bytes.length }, 'x')).not.toThrow();
  });
  it('rejects a changed byte or size', () => {
    expect(() => checkFile(enc('{"a":2}'), { sha256: sha256Hex(bytes), bytes: bytes.length }, 'x')).toThrow(/checksum/);
    expect(() => checkFile(bytes, { sha256: sha256Hex(bytes), bytes: 99 }, 'x')).toThrow(/bytes/);
  });
});

describe('checkSignature', () => {
  const secret = ed25519.utils.randomPrivateKey();
  const pub = bytesToHex(ed25519.getPublicKey(secret));
  const msg = enc('{"schemaVersion":1}');
  const sig = enc(bytesToHex(ed25519.sign(msg, secret)) + '\n');
  it('accepts the owner signature', () => {
    expect(() => checkSignature(msg, sig, pub)).not.toThrow();
  });
  it('rejects a changed manifest, another key, junk, or no key at all', () => {
    expect(() => checkSignature(enc('{"schemaVersion":2}'), sig, pub)).toThrow(ContentError);
    expect(() => checkSignature(msg, sig, bytesToHex(ed25519.getPublicKey(ed25519.utils.randomPrivateKey())))).toThrow(ContentError);
    expect(() => checkSignature(msg, enc('nope'), pub)).toThrow(ContentError);
    expect(() => checkSignature(msg, sig, '')).toThrow(/No content signing key/);
  });
});

describe('compareVersions', () => {
  it('orders x.y.z numerically', () => {
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
    expect(compareVersions('0.9.0', '0.10.0')).toBe(-1);
    expect(compareVersions('1.0.0', '0.99.99')).toBe(1);
  });
});

describe('checkIds', () => {
  const existing = { themeIds: new Set(['animals']), pageIds: new Set(['animal-01']) };
  it('allows a new theme with its pages, and extra pages for an existing theme', () => {
    expect(() => checkIds({ themeId: 'flowers', pages: [{ id: 'flower-01', themeId: 'flowers' }] }, existing)).not.toThrow();
    expect(() => checkIds({ pages: [{ id: 'animal-99', themeId: 'animals' }] }, existing)).not.toThrow();
  });
  it('never reuses an id or targets an unknown theme', () => {
    expect(() => checkIds({ themeId: 'animals', pages: [{ id: 'x-1', themeId: 'animals' }] }, existing)).toThrow(/Theme animals/);
    expect(() => checkIds({ pages: [{ id: 'animal-01', themeId: 'animals' }] }, existing)).toThrow(/Page animal-01/);
    expect(() => checkIds({ pages: [{ id: 'a-1', themeId: 'animals' }, { id: 'a-1', themeId: 'animals' }] }, existing)).toThrow(/Page a-1/);
    expect(() => checkIds({ pages: [{ id: 'space-99', themeId: 'space-2' }] }, existing)).toThrow(/unknown theme/);
  });
});
