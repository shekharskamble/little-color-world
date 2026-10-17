# Content Delivery (Remote Updates)

Status: **design only, Phase 5.** Requires your approval for hosting (possible recurring cost).

## Principles
- Remote content is **data and artwork only**: JSON validated by zod, plus PNG previews. It is never JavaScript or shader code.
- There are no background checks. A check happens only when someone opens **New Pictures** (not parent-gated, decision D7) and taps the check button. Downloads require a second explicit tap.
- A failed download never affects installed content or saved artwork.

## Hosting
Static files on Cloudflare R2 behind a custom domain, for example `content.littlecolorworld.app`. R2 has no egress fees, and its free tier (10 GB storage, 10M reads per month) should cover v1 traffic. **This still needs your approval, plus a domain (about $10–15/year).**

```
/v1/manifest.json                         small, short cache TTL
/v1/manifest.json.sig                     Ed25519 signature (recommended, see below)
/v1/packs/<packId>/<version>/pack.json    immutable, long cache TTL
/v1/packs/<packId>/<version>/pages/<pageId>.json
/v1/packs/<packId>/<version>/previews/<pageId>.png
```
Files under a version path are **never modified**. Any change means a new version.

## Manifest (v1)
```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-11-01T00:00:00Z",
  "packs": [{
    "id": "ocean-friends", "version": 3, "minAppVersion": "1.1.0",
    "title": "Ocean Friends", "pageCount": 12, "totalBytes": 1843200,
    "path": "packs/ocean-friends/3/pack.json",
    "sha256": "…", "bytes": 4123
  }]
}
```
`pack.json` lists every file with `sha256` and `bytes`.

## Client rules
Because a child can trigger downloads, these limits are the main safeguard and must hold in code, not in policy.

| Rule | Value |
|---|---|
| Scheme | `https:` only |
| Host allowlist | exact match, hard-coded in app config |
| Manifest max size | 256 KB |
| Per-file max | 2 MB; per-pack max 50 MB |
| Timeout | 15 s per request |
| Integrity | SHA-256 of bytes must match `pack.json`, and `pack.json` must match the manifest |
| Authenticity (recommended) | Ed25519 signature over the manifest; public key embedded in the app |
| Validation | zod parse of every JSON; geometry validation of every page |
| Compatibility | skip packs whose `minAppVersion` is greater than the app version |

⚖️ **Signatures.** Checksums inside a manifest fetched over HTTPS only detect corruption. If the bucket or domain is ever compromised, an attacker can rewrite both. An Ed25519 signature, made with an offline key the publishing CLI holds, closes that gap for one small pure-JS dependency (`@noble/ed25519`). The content is data-only either way, so the worst case without a signature is inappropriate images. For a kids' app that is exactly the risk worth closing. **Recommended.**

## Atomic install
```
1. download all files → documentDirectory/content/.staging/<uuid>/
2. verify size + sha256 + zod + geometry for every file
3. move staging dir → content/packs/<packId>/<version>/   (single directory rename)
4. SQLite transaction: INSERT installed_content(pack_id, version, path, installed_at)
5. delete staging
```
- At startup, delete any `content/.staging/*` left over from a crash.
- The registry only trusts rows in `installed_content` whose directory exists. A crash between steps 3 and 4 leaves an orphan directory, which gets garbage-collected.
- Older pack versions are kept while any saved artwork references them. The rest are pruned.

## Offline behavior
Installed packs are read from local files only. The registry never touches the network. With the device offline, New Pictures shows a friendly "no internet" state and does nothing else.

## Publishing CLI (Phase 5)
```
npx lcw pack build   content/ocean-friends --version 3     # validate + checksum + pack.json
npx lcw pack sign    dist/ocean-friends/3                  # offline key from macOS Keychain
npx lcw publish      dist/ocean-friends/3 --dry-run        # diff vs live manifest
npx lcw publish      dist/ocean-friends/3                  # upload files, then manifest LAST
```
The manifest is uploaded last, so clients never see a pack whose files are not yet uploaded.
