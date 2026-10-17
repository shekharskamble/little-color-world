# Roadmap and Milestones

Each milestone ends with: `npm run typecheck && npm run lint && npm test` all green, a manual check on the iPad simulator (and on a real iPad once available), and PROGRESS.md updated. Nothing counts as done without verification.

## Phase 0: Foundation
| # | Milestone | Done when |
|---|---|---|
| 0.1 | Expo SDK 58 app (TypeScript strict), Expo Router, ESLint + Prettier, Jest (jest-expo) | `typecheck/lint/test` scripts pass; app boots on the iPad simulator |
| 0.2 | **Spike:** Skia canvas + RNGH 3 tap + Reanimated in Expo Go | A tap on a Skia shape changes its color on the simulator. If this fails, fall back to SDK 57 |
| 0.3 | App config: landscape-only, `requireFullScreen`, iPad-only (`supportsTablet`, `isTabletOnly`), no permissions | Verified in the generated Info.plist (prebuild dry run) |
| 0.4 | Design system tokens + `BigButton`, `Card`, `IconButton`, `Swatch` | Rendered on a dev-only "kitchen sink" screen |
| 0.5 | Route skeleton for all 10 screens with clearly labelled "Coming soon · Phase N" placeholders | Navigation works; depth ≤ 3 |
| 0.6 | SQLite client + migration runner + `meta` and `artwork` tables | Migration tests pass; DB opens at startup |

## Phase 1: First dinosaur page (first technical goal)
| # | Milestone | Done when |
|---|---|---|
| 1.1 | `src/engine/geometry`: path parser (M L H V C S Q T A Z), flattening, bounds, point-in-polygon (nonzero + evenodd), distance-to-polyline | Unit tests, including holes and curves |
| 1.2 | Content schema (zod) + one hand-authored dinosaur page JSON (about 12–18 regions) | Page validates; test covers it |
| 1.3 | History reducer: fill, erase, reset, undo, redo, limit 100, redo cleared on a new action | Unit tests, including 60 consecutive undos |
| 1.4 | Hit testing with view transform + outline tolerance | Unit tests using real dinosaur coordinates |
| 1.5 | Skia renderer: regions + outline Picture on top; solid fills | Visual check on the simulator |
| 1.6 | Coloring screen: Back, Undo, Redo, Eraser, Reset (hold to confirm), palette | Manual test script passes |
| 1.7 | Autosave (debounced + blur + background) and restore | Integration test with the repository; manual kill/relaunch test |

## Phase 2: Rich fills
Gradients (linear, radial, rainbow presets), 8 patterns, 4 textures, fill-type rail, fill animation, palette per age band, renderer performance pass.

## Phase 3: Content
Pipeline CLI (import, validate, preview, review), theme gallery, page selection, at least 30 curated pages across 4+ themes, lazy loading.

## Phase 4: Activities and rewards
Trace and Color (guided paths, tolerance, positive feedback), Free Drawing (brushes, crayon, sizes, stroke eraser, undo/redo, save), My Creations gallery + thumbnails, stickers + album, gentle achievements, completion celebration.

## Phase 5: Remote content
Manifest + pack format, signed manifest, downloader with staging, checksums, and validation, atomic install, registry merge, New Pictures screen, publishing CLI. Requires a hosting decision.

## Phase 6: Procedural variations
Seeded PRNG (for example, mulberry32), compatible asset slots (character × accessory × background), region-ID namespacing (`char.body`, `acc.hat.band`), saved seeds, duplicate reduction by seed+combo hash. Determinism tests.

## Phase 7: Release
Real-device profiling (lowest supported iPad), memory and launch-time budget, accessibility pass, network audit of the release build, privacy policy, App Store Kids Category review, age rating, screenshots, TestFlight, submission.

## Open decisions
| # | Question | Default if no answer |
|---|---|---|
| D1 | Expo SDK 58 (recommended) or 57 | ✅ **Decided 2026-10-17: latest (SDK 58)** |
| D2 | Minimum iPadOS version and lowest supported iPad (affects testing device) | iPadOS 17 or later; test on iPad 9th gen (A13) or 10th gen (A14) |
| D3 | Apple Developer Program ($99/yr) is required for device testing beyond 7 days, TestFlight, and release. Enrolled? | ✅ **Enrolled** |
| D4 | Cloudflare R2 + domain for Phase 5 | Decide before Phase 5 |
| D5 | Signed manifest (Ed25519) | Yes |
| D6 | "Freehand stroke erasing" on coloring pages: is a freehand marker layer on coloring pages wanted, or only in Free Drawing? | Free Drawing only in v1; coloring pages keep a region eraser |
| D7 | Is New Pictures parent-gated? | ✅ **Decided 2026-10-17: no gate.** Children can open New Pictures and start a download; downloads still happen only on an explicit tap and never in the background |
| D8 | Persist undo history across app restarts? | No (fills persist; history is session-only) |
| D9 | Bundle identifier / app name availability on the App Store | `app.littlecolorworld.ios` (check availability) |
