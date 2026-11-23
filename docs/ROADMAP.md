# Roadmap and Milestones

Each milestone ends with: `npm run typecheck && npm run lint && npm test` all green, a manual check on the iPad simulator (and on a real iPad once available), and PROGRESS.md updated. Nothing counts as done without verification.

## v1 scope (decided 2026-11-03, owner)
**Revised 2026-11-14 (owner), after App Review rejected the first submission under guideline 4.3 (spam / duplicate apps):** v1 also ships **Trace and Color** (A–Z, a–z, 0–9 and shapes, each traced then coloured), so the app is more than a tap-to-fill catalog of stock clipart. Spoken letter names come in a later update. Progress: PROGRESS.md.

**Originally, v1 shipped Tap to Color only**: 425 pages in 10 themes, with the paint bucket, brush, pencil and eraser; plain, glitter, pattern and rainbow paints; undo/redo; autosave; the camera to Photos; and celebrations. Trace and Color, Free Drawing, My Creations, Stickers, the Parents area and New Pictures follow in later updates (Phase 4 onward), one at a time. Their routes stay as labelled "Coming soon" placeholders that the home screen does not link to.

**Trace and Color in v1: done 2026-11-23** (72 items, PROGRESS.md). Still open for it: a real-iPad try with a child's finger, and spoken letter names (later update).

**Release checklist for v1** (Phase 7, trimmed to this scope):
- [x] Parental gate before every link out of the app (the "Open Settings" button), 2026-11-03.
- [x] App icon (2026-11-03).
- [ ] **Owner:** confirm each clipart pack's licence allows a paid app (art/PROVENANCE.md "to be confirmed"), plus the camera and tool pictures (Icons8 style).
- [ ] Real-iPad test pass: every tool and paint, autosave after killing the app, camera save and the denied-Photos path, airplane mode.
- [ ] Performance on the lowest supported iPad (D2): tap-to-fill under 100 ms, launch time, memory with large pages.
- [ ] Accessibility pass (VoiceOver labels, Reduce Motion).
- [ ] Network audit of the release build: zero requests.
- [x] Privacy policy and support pages live on GitHub Pages (2026-11-03, `site/`, docs/ASO.md).
- [ ] Age rating and Kids Category (Made for Kids, 5 and under) in App Store Connect.
- [x] App Store listing text, 10 iPad 13" screenshots and an app preview video (2026-11-03, docs/ASO.md; text and screenshots 02, 03, 07, 10 updated for Trace and Color 2026-11-23).
- [ ] **Owner:** fill in the "Notes for App Review" (docs/ASO.md) before resubmitting. **Owner:** clipart licences must also cover marketing use; check the name is free.
- [ ] TestFlight build, then submission.

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
- ✅ 2026-11-02: palette tabs (48 colours, 8 patterns in the chosen colour, 12 rainbows), linear gradients, the pattern shader, a star pop and light haptic on every fill, a star shower and success haptic when the whole picture is coloured, and a camera that snapshots the artwork, previews it and saves it to Photos.
- Still open: radial gradients, textures, fill animation, palette per age band, renderer performance pass on the lowest supported iPad.

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
| D4 | Content hosting for Phase 5 | ✅ **Decided 2026-11-13 (owner): Firebase Hosting**, project `littlecolorworld-content`, at `littlecolorworld-content.web.app` (no app SDK). Spark (free) plan caps downloads at about 360 MB/day; move to Blaze with a budget alert as installs grow. A custom domain would need an app update to switch to later. |
| D5 | Signed manifest (Ed25519) | ✅ Yes, built 2026-11-13. The production key is created by the owner with `npm run lcw -- pack keygen` (Keychain) |
| D6 | "Freehand stroke erasing" on coloring pages: is a freehand marker layer on coloring pages wanted, or only in Free Drawing? | **Decided 2026-10-31 (owner): yes.** Coloring pages have a brush with three thicknesses. Strokes stay inside the region they start in. The region eraser clears a region's fill and its strokes. **2026-11-02:** dragging the eraser rubs out brush paint only (eraser strokes). |
| D7 | How do new pictures arrive? | ✅ **Revised 2026-11-13 (owner): automatic.** One check per app launch while the app is open; new packs download, verify and install by themselves and appear first in the theme picker with a NEW badge. Never in the background, no identifiers sent. (Was 2026-10-17: only after a tap in an ungated New Pictures screen.) || D8 | Persist undo history across app restarts? | No (fills persist; history is session-only) |
| D9 | Bundle identifier / app name availability on the App Store | `app.littlecolorworld.ios` (check availability) |
| D11 | What is in v1? | ✅ **Decided 2026-11-03 (owner): Tap to Color only**, then add the other activities in updates. See "v1 scope" above. |
| D10 | Saving a picture to Photos: parent-gated, or the child's choice? | ✅ **Decided 2026-11-02 (owner): no gate.** The child taps the camera, sees the preview and taps ✓ to save. iOS asks once for add-only Photos access (the app can never read the library). |
