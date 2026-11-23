/**
 * Remote content settings (docs/CONTENT_DELIVERY.md). These limits are the main safeguard and must hold in code.
 *
 * `PUBLIC_KEY_HEX` is the Ed25519 key the production manifest must be signed with. Its private half lives only in the
 * owner's macOS Keychain (`npm run lcw -- pack keygen`). While it is empty, release builds never check for updates.
 *
 * Development builds read a local server (`npm run lcw -- pack serve`) and check `DEV_PUBLIC_KEY_HEX` instead. Its
 * private key is a throwaway for testing (LCW_SIGNING_KEY); it can only sign content for localhost, which release
 * builds never contact.
 */
/**
 * Firebase Hosting, project `littlecolorworld-content` (firebase.json, `npm run lcw -- pack deploy`). Every installed
 * app has this host built in: moving to a custom domain later needs an app update, so switch before release if wanted.
 */
export const CONTENT_HOST = 'littlecolorworld-content.web.app';
export const CONTENT_BASE_URL = `https://${CONTENT_HOST}/v1/`;

/** Development builds read `npm run lcw -- pack serve` on this Mac instead (plain HTTP, localhost only). */
export const DEV_CONTENT_BASE_URL = 'http://localhost:8787/v1/';

export const PUBLIC_KEY_HEX = '';
export const DEV_PUBLIC_KEY_HEX = '550430a14f0ba8c7d425d6cf04c787ba0507acf65d5a3bb55ca1be8f370b8521';

export const LIMITS = {
  manifestBytes: 256 * 1024,
  signatureBytes: 1024,
  packIndexBytes: 256 * 1024,
  fileBytes: 2 * 1024 * 1024,
  packBytes: 50 * 1024 * 1024,
  timeoutMs: 15_000,
} as const;

export type ContentSource = { baseUrl: string; allowedOrigins: readonly string[]; publicKeyHex: string };

export function contentSource(dev: boolean): ContentSource {
  return dev
    ? { baseUrl: DEV_CONTENT_BASE_URL, allowedOrigins: ['http://localhost:8787'], publicKeyHex: DEV_PUBLIC_KEY_HEX }
    : { baseUrl: CONTENT_BASE_URL, allowedOrigins: [`https://${CONTENT_HOST}`], publicKeyHex: PUBLIC_KEY_HEX };
}
