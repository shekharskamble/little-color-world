# Content Delivery (Remote Updates)

Status: **client, publishing CLI and hosting set up (2026-11-13).** Hosting is Firebase Hosting (ROADMAP D4). Not live yet: the production signing key must be created (below). Until it is, release builds never go online and `pack deploy` refuses to publish.

New pictures reach existing installs without an App Store update. They download by themselves when the app opens and appear **first in the theme picker with a NEW badge** (decision D7, revised 2026-11-13).

## Principles
- Remote content is **data only**: page JSON (the converted coloring pages) validated by zod and the full geometry check. Never JavaScript, shaders, or raw SVG. The SVG → page conversion stays on the Mac (docs/ARTWORK_PIPELINE.md).
- **One check per app launch while the app is open.** Never in the background, no identifiers sent, plain GETs of public files.
- A failed or tampered download never affects installed content or saved artwork. Failures are per pack; the next launch tries again.

## Owner workflow
1. Make pages as usual (a `tools/<theme>/generate.ts --import`). They land in `content/pages/`.
2. Mark them CDN-only in **`content/remote.json`**: a theme id under `themes` (whole theme, including its `themes.json` entry) or page ids under `pages` (extra pictures for a theme the app already has). `npm run lcw -- index` then leaves them out of the app bundle.
3. Build a pack. Each version is immutable:
   ```
   npm run lcw -- pack build garden --version 1 --theme garden          # new theme (listed in remote.json)
   npm run lcw -- pack build more-flowers --version 1 --pages flower-41,flower-42
   ```
   Optional `--min-app 1.2.0` for pages that need a newer app (e.g. a new fill type).
4. `npm run lcw -- pack manifest`: lists the newest version of every built pack and signs `manifest.json` with the Keychain key.
5. `npm run lcw -- pack deploy` (`--dry-run` to check only): verifies the signature against the app's production key and every file's size and SHA-256, then runs `firebase deploy --only hosting`. A Firebase deploy switches the whole site at once, so the manifest and its packs always go live together.
6. Commit `content/cdn/`. **It is the published site**: a deploy replaces everything on Firebase with this folder, so a pack missing from it would disappear for new installs.

Test on the simulator first: `npm run lcw -- pack serve` serves `content/cdn` at `http://localhost:8787/v1/`, which **development builds** read instead of the real host. Sign with the dev key: `LCW_SIGNING_KEY=<dev key hex> npm run lcw -- pack manifest`, and rebuild the manifest with the Keychain key before deploying. To try the real host without going live: `firebase hosting:channel:deploy <name> --expires 1h` (a throwaway preview URL).

One-time setup: `npm run lcw -- pack keygen` stores the private key in the login Keychain (`little-color-world-content-signing`) and prints the public key to paste into `PUBLIC_KEY_HEX` in `src/features/content-updates/config.ts`. Keep a backup of the Keychain item: losing it means a new key can only reach users through an app update.

## Hosting
**Firebase Hosting**, project `littlecolorworld-content`, site `https://littlecolorworld-content.web.app` (owner decision 2026-11-13). It serves plain files only: the app contains no Firebase SDK. Config: `firebase.json` (public folder `content/cdn`, cache headers) and `.firebaserc`.

- Cache: `manifest.json` and its signature 5 minutes; everything under `packs/` one year, immutable (verified 2026-11-13 on a preview channel, along with byte-for-byte checksums of all files).
- Free (Spark) plan: about 10 GB stored and **about 360 MB of downloads per day**. A new install downloads every published pack, so this covers only a few dozen new families a day once there are several packs. When the quota runs out the site stops answering until the next day; apps just try again next launch. Move to Blaze (pay as you go, about $0.15/GB) with a budget alert as installs grow, and fold older packs into the app bundle at each app update (installed copies retire themselves).
- The host is built into every app. Moving to a custom domain later needs an app update, so decide before release.

```
/v1/manifest.json                                    short cache TTL
/v1/manifest.json.sig                                hex Ed25519 signature over manifest.json's bytes
/v1/packs/<packId>/<version>/pack.json               immutable, long cache TTL
/v1/packs/<packId>/<version>/pages/<pageId>.json
```
(`release.json` beside `pack.json` holds build settings for the manifest step; firebase.json leaves it out of the site.)

## Formats (`src/content/schema/pack.ts`)
- **Manifest**: `{ schemaVersion: 1, generatedAt, packs: [{ id, version, minAppVersion, path, sha256, bytes }] }`.
- **pack.json**: `{ schemaVersion: 1, id, version, theme?, pages: [{ id, path, sha256, bytes }] }`. `theme` (a full themes.json entry) is present only when the pack brings a new theme. Page paths are relative to pack.json.

## Client (`src/features/content-updates/`)
| Rule | Value |
|---|---|
| Scheme / host | `https://littlecolorworld-content.web.app/v1/` only (development builds: `http://localhost:8787/v1/`); redirects off the host are refused |
| Paths | lowercase segments only, no `..` (zod) and resolved URLs must stay under the content root |
| Sizes | manifest 256 KB, pack.json 256 KB, page 2 MB, pack 50 MB |
| Timeout | 15 s per request |
| Authenticity | Ed25519 signature over the manifest bytes, public key embedded (`@noble/curves`) |
| Integrity | SHA-256 + exact size of pack.json (from the manifest) and of every page (from pack.json) (`@noble/hashes`) |
| Validation | zod for every JSON, then `validatePage` (full geometry check) for every page; the file's page id must match |
| Ids | a pack never reuses a theme or page id the app already has (bundled or another pack); every page's theme must exist |
| Compatibility | packs whose `minAppVersion` is above the app version are skipped |

## Install (`packStore.ts`, `updater.ts`)
```
1. download + verify everything in memory
2. write to documentDirectory/content/packs/<packId>/.staging-<version>/, then rename to <version>/
3. SQLite transaction: installed_content row, plus new_page rows for pictures this device did not have
4. remove the previous version's folder (upgrade), tell the registry, preload the new pages
```
- At launch, packs are read back from disk into the registry before the catalog shows. A pack that is unreadable, or that now clashes with bundled content (an app update shipped the same pictures), is dropped; leftover staging and orphan folders are deleted.
- Only the newest version of a pack is kept. An upgrade that drops a picture removes it; saved artwork of that picture stays in the database but its page no longer opens. Avoid dropping pictures from a published pack.

## NEW badges (`new_page` table, `newBadges.ts`)
- A theme with pictures that arrived and that has not been opened since goes **first in the theme picker** with a NEW badge (newest arrival first). Opening the theme clears its badge.
- Inside the theme, each new picture has its own NEW badge until it is opened. Pictures that arrived in the last 14 days stay at the front, so a picture does not jump away the moment a child opens it.
