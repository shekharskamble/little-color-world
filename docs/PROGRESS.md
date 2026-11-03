# Progress Log

Newest first. Each entry records what changed, how it was verified, and what is next.

## 2026-10-17: Phase 0 + Phase 1 (first dinosaur page)

**Decisions received:** D1 latest Expo (SDK 58) · D3 Apple Developer Program enrolled · D7 New Pictures *not* parent-gated. Others use the defaults in ROADMAP.md.

**Built**
- Expo SDK 58 app (RN 0.88, React 19.3, TS 6.0 strict + `noUncheckedIndexedAccess`), Expo Router under `src/app`, ESLint (expo flat config + a rule keeping `src/engine` platform-free), Jest 30 via jest-expo.
- app.json: landscape, iPad-only, `requireFullScreen`, no permissions, `ITSAppUsesNonExemptEncryption: false`. Bundle id `app.littlecolorworld.ios` is a **placeholder** (D9).
- Engine (pure TS): SVG path parser (full grammar incl. arcs) + flattening, point-in-shape (nonzero/even-odd), edge distance, view transform; hit testing (topmost-first, locked regions pass taps through, outline tolerance); undo/redo reducer (limit 100, undoable reset, no-op detection, redo cleared on new action); debounced serialized autosaver.
- Content: zod schema (page, region, outline, theme; solid fills only), geometry validator, hand-authored `dino-stegosaurus-01` (16 regions, 1 locked eye), bundled registry.
- Persistence: migration runner (`PRAGMA user_version`, one transaction per migration, refuses newer DBs), `artwork` + `preferences` tables, artwork repository (upsert, corrupt-row fallback).
- UI: tokens, IconButton, BigCard, Screen; Home → Themes → Page Selection (live Skia thumbnails showing saved progress) → Coloring. Coloring screen: Back, Undo, Redo, Start over (hold-to-confirm sheet), 14-color palette + eraser, tap-to-fill on a Skia canvas, light haptic. Autosave 1.5 s after the last edit plus flush on blur, background and unmount. Restore on reopen, with taps disabled until restore completes.
- Placeholders, clearly labelled "Coming soon · Phase N": Trace, Draw, My Creations, Stickers, Parents Area, New Pictures.

**Verified**
- `npm run typecheck` ✅ · `npm run lint` ✅ (0 problems) · `npm test` ✅ **53/53** across 7 suites: path parsing, polygon tests, hit testing on the real dinosaur coordinates (incl. draw order, locked pass-through, screen→page mapping, tolerance), history (incl. 60 consecutive undos/redos and the 100 cap), validation, autosave timing, and SQLite migrations + save/restore against a real SQLite engine.
- `expo-doctor` 20/20 ✅.
- iPad (10th gen) simulator in Expo Go: app bundles and Home renders (screenshot checked).
- Offline previews of the dinosaur rendered with CanvasKit (debug + colored): fills meet outlines with no seams, the outline stays on top, the locked eye keeps its color.

**Not yet verified (needs a human or a dev build)**
- Tapping on the coloring canvas, undo/redo/reset buttons, and kill/relaunch restore *in the running app*. I can't send taps to the simulator (macOS blocks scripted input without Accessibility permission), and deep links reload Expo Go to Home. The logic underneath is unit-tested; the on-device wiring is not.
- Landscape lock on a device: config and runtime lock are in place (see the 2026-10-17 entry), but rotation has not been checked on a dev build or real iPad.
- Real-iPad performance.

**Known limitations / interim choices**
- Emoji glyphs stand in for illustrated icons. They are temporary and will be replaced in Phase 3/7.
- Undo history is not persisted across restarts (D8 default).
- No fill animation or sound yet (Phase 2).
- Parental gate not built yet. Parents Area has no adult content so far; the gate lands with it.

**Manual test script (run on the simulator or an iPad)**
1. Home → 🎨 → 🦕 → dinosaur. Tap sky, body, a plate, a leg: each fills with the selected color. Tap the eye: the head fills.
2. Tap on a thick black line next to a region: the nearby region fills (the outline is never covered).
3. Choose 🧽 and tap a filled region: it returns to white.
4. ↩️ several times, then ↪️. Undo a few times, then fill something new: ↪️ becomes disabled.
5. 🗑️: a quick tap on ✓ does nothing; hold ✓ for 1.5 s to clear. ↩️ brings the picture back.
6. Color something, wait 2 s, swipe the app away, relaunch: the colors are restored, and the page card thumbnail shows them.

**Next:** run the manual script. Free disk space, then make a development build to verify landscape and on-device behavior. Then Phase 2 (gradients, patterns, textures).

## 2026-10-17: Planning (no code yet)

**Environment inspected** (MacBook Pro M1 Pro, 16 GB, macOS 26.3)
| Tool | Found | Status |
|---|---|---|
| Node | 24.14.0 (nvm), npm 11.9.0, yarn 1.22.19 | ✅ |
| Xcode | 26.2, iOS simulators 17.5 / 18.1 / 18.3 / 26.2, iPad sims including iPad (10th gen) and iPad mini 6 | ✅ |
| CocoaPods | 1.15.2 on system Ruby 2.6.10 | ⚠️ works for now; may need an upgrade if the SDK 58 prebuild complains |
| Watchman | missing | ⚠️ recommended: `brew install watchman` |
| Git | 2.50.1, identity configured | ✅ |
| GitHub CLI | missing | optional |
| EAS CLI | missing | optional (local builds via `npx expo run:ios` are free) |
| Java / Android SDK | Java 19, Android SDK present | n/a until Android phase (RN needs JDK 17) |
| **Disk** | **13 GB free of 460 GB (98% used)** | ❌ **blocker**: iOS native builds need ~20–30 GB headroom |

Reclaimable caches (not touched): Xcode DerivedData 26 GB, iOS DeviceSupport 23 GB, CoreSimulator 15 GB, ~/.gradle 12 GB, Android SDK 21 GB.

**Package compatibility checked against npm:** Expo SDK 58 (latest 58.0.14, released 2026-09-29) bundles RN 0.88.0, React 19.3.0, Skia 2.14.0, Reanimated 4.7.1, Worklets 0.13.0, RNGH ~3.3.0, expo-sqlite ~58.0.13, expo-file-system ~58.0.9, expo-router ~58.0.20.

**Created:** git repo + CLAUDE.md, README.md, docs/* (product, architecture, UX, roadmap, artwork pipeline, content delivery, this log).

**Verified:** documentation only. There is no code to test yet.

**Next:** await approval of the plan and the open decisions in ROADMAP.md, then Milestone 0.1.

## 2026-10-17: Strict landscape lock

**Changed:** `app.json` now sets `UISupportedInterfaceOrientations` and `UISupportedInterfaceOrientations~ipad` to LandscapeLeft/Right only, and adds the `expo-screen-orientation` plugin with `initialOrientation: LANDSCAPE`. `src/app/_layout.tsx` calls `ScreenOrientation.lockAsync(LANDSCAPE)` on mount. New dependency `expo-screen-orientation` (installed with `npx expo install`): it enforces the lock at runtime, which also covers Expo Go, where the app.json orientation is ignored.

**Verified:** `npx expo config --type introspect` shows only landscape orientations for iPhone and iPad, plus `EXDefaultScreenOrientationMask = Landscape`. typecheck, lint, and tests pass (53/53). `npm run doctor` failed: `expo-doctor` is not installed locally.

**Not verified:** rotating a real device or dev build. Expo Go on iPad may refuse the runtime lock, because Expo Go allows multitasking.

**Next:** run `npx expo prebuild` (or `run:ios`) so the generated `ios/` picks up the plugin, then rotate the iPad simulator to confirm.

## 2026-10-17: Toy Box UX (Home and Coloring)

**Changed:** Chose the Toy Box direction from three mockups (docs/UX.md, "Visual direction"). New `ToyButton` (face plus lip), `Icon` with vector paths in `src/ui/icons.ts` (drawn with Skia, no new dependency), and `shade()` for deriving lips from tints. `IconButton` now takes an `icon` name instead of an emoji glyph. Home: wordmark with logo mark, a big Color tile showing the first bundled page, a 2×2 activity grid, a pink New Pictures button, and a low-contrast Parents pill. Coloring: toy-style back, undo, redo and start-over buttons, the canvas on a lipped white card, a 2-column palette of 64 pt swatches (12 colors, down from 14 so the rail fits), and an eraser tile. ResetSheet uses vector ✕/✓ icons. Theme and page cards use the lipped `BigCard`.

**Verified:** typecheck, lint, tests 55/55 (new `shade.test.ts`). iPad (10th gen) simulator in Expo Go: Home and Coloring screenshots checked, the app shows in landscape, and saved fills restore on the Coloring screen.

**Not verified:** press animations and taps (no scripted input on the simulator), and real-device performance with one Skia canvas per icon.

**Deliberately not added:** the fill-type rail (Phase 2) and the ★ done button (Phase 4 celebrations). Neither has behavior yet, so neither is shown.

**Next:** restyle the theme and page pickers and the Coming Soon screens, and replace the remaining emoji with vector icons.


## 2026-10-29: Sunny Meadow theme and catalog

**Changed:** The app-wide look is now "Sunny Meadow" (docs/UX.md). `Screen` draws a new vector `SunnyBackdrop` (sky gradient, smiling sun, clouds, hills, bushes, flowers) behind every screen. The Coloring screen uses the quieter `sky` variant. New `CatalogCard` (white card, thick accent border, name pill) and `RainbowTitle`. The theme picker is now a 3×2 catalog: Animals, Vehicles, Dinosaurs, Unicorns, Princesses, Sea Animals (`content/themes.json`, where `color` is now the card accent). The page picker uses the same cards without pills. Home's hero picture now comes from the first theme that has a page. `BigCard` has no remaining users.

**Background image:** I searched for a free, commercially licensed image. The best CC0 match, OpenGameArt "meadow background" by bart, is a realistic blue-sky field with ragged white edges, so I drew the scene as Skia vectors instead. We own it, it stays sharp at any resolution, and it adds no asset or dependency.

**Stubbed (visible):** 5 of the 6 themes have no pages yet. Their catalog cards show an empty image slot, and opening one shows an empty card with "New pictures are coming soon". Real content and cover artwork arrive in Phase 3.

**Verified:** typecheck, lint, tests 55/55.

**Next:** theme cover artwork, a chunkier display font (e.g. an OFL-licensed rounded font through expo-font) if `ui-rounded` heavy is not playful enough, and restyling the Coming Soon screens with the catalog card.

## 2026-10-29: Home simplified to one action

**Changed:** Home now shows only a large centered `RainbowTitle` ("Little Color World", new `big` size) and one green `ToyButton` reading "Let's Color" with a palette icon, which opens the catalog (`/themes`). The activity grid, hero tile, New Pictures and the Parents pill are removed from Home. Their routes and Coming Soon screens remain and can be linked again as each mode is built.

**Note:** the Parents Area currently has no entry point. It has to come back (behind the parental gate) before release, because sound settings and the gate live there.

**Verified:** typecheck, lint, tests 55/55.

## 2026-10-29: Denser Sunny Meadow backdrop

**Changed:** `SunnyBackdrop` adds birds, three bees with dotted flight trails, two butterflies, two round trees and two pines, a third (far) hill, grass tufts, and four more flowers, including a new blue one. Clouds are now opaque, which removes the seams where puffs overlapped. New `scenery.*` tokens cover these. Trees stand in the foreground band so catalog cards never hide them.

**Verified:** typecheck, lint, tests 55/55. iPad Pro 13" simulator screenshots of Home and the catalog. Metro's file watcher kept serving stale modules (watchman is not installed), so each check needed `npx expo start --port 8082 --clear`.

**Next (optional):** gentle idle motion (bees bobbing, butterflies flapping) through Reanimated, respecting Reduce Motion.

## 2026-10-29: Backdrop simplified

**Changed:** The owner rejected the denser backdrop as cluttered. `SunnyBackdrop` is now just the sky gradient, the sun, clouds, the pink doodle, and two plain hills. Removed: trees, bushes, flowers, grass, bees, butterflies, birds, the far hill, and their `scenery.*` tokens.

**Verified:** typecheck, lint, tests 55/55. iPad Pro 13" simulator screenshots of Home and the catalog.

## 2026-10-29: Backdrop, final balance

**Changed:** At the owner's request, edge framing is back in `SunnyBackdrop`, kept sparse: a corner bush with a flower on each side, a round tree and a pine on each side (mirrored and placed clear of the bushes so they read), two bees with dotted trails, two butterflies, and two pairs of birds. The center stays open.

**Verified:** typecheck, lint, tests 55/55. iPad Pro 13" simulator screenshots of Home and the catalog: nothing is covered by the cards, and the composition is symmetric.

## 2026-10-29: Backdrop, simple with corner bushes (final)

**Changed:** The owner still disliked the framed scene. `SunnyBackdrop` is now the sky, sun, clouds, pink doodle, two hills, and one bush in each bottom corner. Removed: trees, pines, flowers, bees, butterflies, birds, and their tokens and components.

**Verified:** typecheck, lint, tests 55/55. iPad Pro 13" simulator screenshots of Home and the catalog.

## 2026-10-29: Backdrop critters

**Changed:** `SunnyBackdrop` adds only critters to the simple scene: two pairs of birds, one bee above each corner bush, and two butterflies. No trees or flowers.

**Verified:** typecheck, lint, tests 55/55. iPad Pro 13" simulator screenshots of Home and the catalog.

## 2026-10-29: Paged catalog with arrows

**Changed:** The catalog is now a horizontal paged scroller (`src/features/catalog/CatalogPager.tsx`), with 6 cards (3×2) per page and orange ◀ ▶ arrow buttons. The arrows dim at either end. Pure helpers `chunk` and `clampPage` live in `src/features/catalog/paging.ts`, with tests. New `next` icon. The route `src/app/themes/index.tsx` now only lays out the header and the pager.

**Verified:** typecheck, lint, tests 60/60 (5 new). On the iPad Pro 13" simulator, with 4 temporary test themes added to `themes.json` (since restored): page 1 shows 6 cards with ◀ dimmed. Tapping ▶ moves to page 2 (4 cards, grid kept, ▶ dimmed). Tapping ◀ returns to page 1.

**Not verified:** swipe gestures (page sync on swipe relies on `onMomentumScrollEnd`). They need a manual check on device.

## 2026-10-29: Catalog heading

**Changed:** Removed the "Let's Color!" rainbow title from the catalog. The subtitle is now 34 pt (was 22) and vertically centered with the back button. `RainbowTitle` now takes an optional `title` and a `subtitleFontSize`. The right-hand pair of birds moved right so it clears the longer subtitle.

**Verified:** typecheck, lint, tests 60/60. iPad Pro 13" simulator screenshot of the catalog.

## 2026-10-29: Artwork pipeline v1 (Inkscape → page JSON)

**Changed:** New CLI `npm run lcw` in `tools/lcw/` with these commands: `page import`, `page validate`, `page preview`, `page export-svg`, `index`. Inkscape layer convention: `regions` (labelled closed shapes; their strokes become outline), `details` (locked, pre-colored), `outline` (strokes only), and any other layer is ignored (for reference images). Template: `art/templates/coloring-page-template.svg`. The app's page list is now generated (`src/content/bundledPages.ts`, imported by `registry.ts`). The dinosaur's editable source is at `art/svg/dinosaurs/dino-stegosaurus-01.svg`. Provenance log: `art/PROVENANCE.md`. Jest now also runs `tools/**` tests. `art/previews/` is gitignored.

**New dev dependencies:** `tsx` (runs the TypeScript CLI, as planned in ARTWORK_PIPELINE.md), plus `@xmldom/xmldom` 0.8.15 (SVG parsing) and `canvaskit-wasm` 0.41.0 (PNG previews), pinned to the versions already installed through Expo and Skia. All three are dev-only and do not ship in the app.

**Verified:** typecheck, lint, tests 78/78 (18 new: transform parsing, shape conversion, layer rules, naming errors, merging, details, rejected elements, and a dinosaur export→import round trip with equal region ids and areas). Manual end to end: imported the template as a temporary page (0 issues) and inspected both previews. Renaming a region on re-import was blocked. Re-importing unchanged input reported "No changes". `page validate` passed for all pages. The temporary page was then removed.

**Not built yet:** automatic regionization of outline-only art, the HTML review sheet, and a coverage check for gaps (the debug preview shows gaps visually).

**Next:** draw the first real page per theme, starting with Animals.

## 2026-10-29: First Animals page (elephant) and hidden-stroke trimming

**Changed:** New page `animal-elephant-01` ("Friendly Elephant", Animals), drawn as an Inkscape-convention SVG (`art/svg/animals/animal-elephant-01.svg`) and imported with `npm run lcw`. It has 12 fillable regions (sky, ground, sun, cloud, two ears, two inner ears, body, two feet, and head+trunk as one region) and 6 locked details (eyes, eye shines, cheeks). Outline-layer extras: trunk wrinkles, smile, toes, sun rays, grass. It is now the Animals catalog cover. Importer fix: region and detail strokes are trimmed where later shapes cover them (`tools/lcw/visibleStroke.ts`). Without this, outlines of shapes behind others showed through, because outlines render above all fills.

**Verified:** typecheck, lint, all tests (5 new trimming tests). Import reports 0 errors and 0 warnings, and both previews were inspected. On the iPad Pro 13" simulator: the Animals card shows the elephant, the page opens, tapping the head fills head and trunk as one region, and undo works (the test fill was undone).

## 2026-10-30: Vehicles scene page (road)

**Changed:** New page `vehicle-road-01` ("Road Trip", Vehicles) from the owner's Affinity Designer drawing `art/svg/vehicles/background.svg`. That file is not in the importer's format: no layers or labels, an embedded 10946×10271 PNG through `<use>` (rejected), and a 11811 viewBox. So it was converted into `art/svg/vehicles/vehicle-road-01.svg`, an Inkscape-convention file with the original 17 thick strokes wrapped in a scale transform. The 6 road dashes are on the outline layer. The other 11 shapes are named regions. A full-page `sky` region is added behind them. The left cloud was closed (a 1.5 px gap). The right bird and the small puff were enlarged about their centres, because at the original size they were below the 0.4% minimum region area for ages 2–3. The page has 12 regions, 0 details, and a 7.5 KB JSON. It shows second in the Vehicles theme; the car stays the cover. The original `background.svg` (2.5 MB, mostly the embedded PNG) is kept as the source drawing.

**Verified:** import and `page validate` report 0 errors and 0 warnings. Both previews were inspected: every shape fills, with no gaps. Typecheck, lint, and tests 88/88 pass. Not yet checked on the simulator.

**Next:** decide what the circles and square represent (currently named `circle-left`, `circle-right`, `square`). They could get vehicle-scene details, for example wheels or a house.

## 2026-10-31: Vehicles page (four ovals)

**Changed:** New page `vehicle-ovals-01` ("Ovals", Vehicles) from the owner's Affinity export `art/svg/vehicles/ovals.svg`. Its outlines are filled black bands (expanded strokes), with the hidden parts of the back ovals cut away. The importer only accepts stroked outlines, so `art/svg/vehicles/vehicle-ovals-01.svg` rebuilds each oval from its band's outer edge. Where an oval goes behind another, the gap is closed with a straight line between two points on the front oval's edge, so the front oval's fill hides it. The ovals are painted back to front (top-left, top-right, middle, bottom), and the importer trims the outlines that end up hidden. The stroke is 10 on the 1024×768 page, the same as the other pages. A full-page `background` region was added. There are 5 regions and the JSON is about 20 KB, mostly the trimmed outlines, which are stored as polylines.

**Verified:** import and `page validate` report 0 errors and 0 warnings. Both previews were inspected and match the original drawing, including the overlaps. Typecheck, lint, and tests pass. Not yet checked on the simulator.

**Converter note:** Affinity exports outlines as filled bands unless the stroke is kept as a stroke. Exporting with strokes intact, as in `background.svg`, makes conversion simpler.

## 2026-10-31: Vehicles page (six rectangles)

**Changed:** New page `vehicle-rectangles-01` ("Rectangles", Vehicles) from the owner's Affinity export `art/svg/vehicles/rectangles.svg`. That file has six stroked rectangles and no layers or names. `art/svg/vehicles/vehicle-rectangles-01.svg` keeps the same rectangles in the same paint order, scaled to 1024×768 with a stroke of 10, and names them by position. A full-page `background` region was added. There are 7 regions. The small gap enclosed by the middle and lower rectangles is part of the background, as in the original.

**Verified:** import and `page validate` report 0 errors and 0 warnings. The debug preview was compared with a render of the original. Typecheck, lint, and tests pass. Not yet checked on the simulator.

## 2026-10-31: Shapes theme (30 pages) and page titles on the Coloring screen

**Changed:**
- **New theme:** Shapes (`content/themes.json`, accent `#2BA89C`, order 0, so it is first in the catalog). It has 30 pages that build up step by step:
  - 01–14: one big shape each, with a friendly face (locked eyes and a smile line): circle, square, triangle, rectangle, oval, star, heart, diamond, half circle, crescent, pentagon, hexagon, octagon, trapezoid.
  - 15–18: pairs (circle and square, triangle and rectangle, star and heart, oval and diamond).
  - 19–24: simple pictures made of 2–4 kinds of shape (house, ice cream, snowman, fish, pine tree, boat).
  - 25–30: busier pictures for ages 4–5 (car, rocket, night sky, honeycomb with a bee, robot, and a Shape Parade review page with all 14 shapes).
- **Age bands:** pages 1–24 are 2–3 and pages 25–30 are 4–5. Every page has a full-page `background` region. Picture region ids name their shape (`roof-triangle`, `wheel-left-circle`).
- **Generator:** the pages are generated by `tools/shapes/generate.ts` (`--import` imports them) into `art/svg/shapes/`.
- **Page subtitle:** new optional `subtitle` on pages (schema, importer and `--subtitle` flag, kept on re-import). Single shapes describe the shape ("3 sides, 3 corners"). Pictures list their shapes.
- **Coloring screen:** shows the page title and subtitle centered in the top bar (`RainbowTitle`, which now shrinks to fit on one line).
- **Page selection grid:** now scrolls, because 30 pages do not fit in the fixed grid.

**Verified:**
- All 30 pages import with 0 errors and 0 warnings. `page validate` passes for 38/38 pages.
- Typecheck and lint pass. Tests pass 121/121, including a new subtitle test and the bundled-page checks for the new pages.
- A contact sheet of all 60 previews (blank and debug) was inspected. One fix came from it: a bee stripe crossed the wing.
- On the iPad Pro 13" simulator, screenshots confirmed that:
  - the Shapes grid shows and scrolls;
  - Trapezoid and Rocket show their title and subtitle above the picture, and the longest subtitle fits.

**Not verified:** tapping to fill on the new pages in the simulator. Region fills are covered by the validator and the debug previews.

**Next:** possible audio for shape names (the subtitle is text only, which suits grown-ups). The catalog cover for Shapes is the circle page until theme artwork exists.

## 2026-10-31: Shapes theme hidden

**Changed:** The owner judged the Shapes artwork not good enough yet, so the theme is hidden from the catalog. Themes have a new optional `hidden` flag (schema default `false`), and `listThemes()` leaves hidden themes out. Shapes has `"hidden": true` in `content/themes.json`. Nothing was deleted:
- The 30 pages are still bundled and validated.
- The generator (`tools/shapes/generate.ts`) and `art/svg/shapes/` are unchanged.
- The page title and subtitle on the Coloring screen, and the scrolling page grid, stay.

**Verified:** typecheck and lint pass. Tests pass 122/122, including the new `src/content/registry.test.ts`, which checks that the hidden theme is not listed but is still found by id. `page validate` passes for 38/38 pages. A simulator screenshot shows the catalog back to the six original themes.

**Next:** rework the Shapes artwork, then remove `"hidden": true`.

## 2026-10-31: Animals page (lion)

**Changed:** New page `animal-lion-01` ("Friendly Lion", Animals) from the owner's Affinity export `art/svg/animals/lion.svg`. The body and ground in that file are open lines that stop at the mane and paws, so there was nothing to tap. The conversion (`art/svg/animals/animal-lion-01.svg`) works like this:
- The closed shapes (mane, ears, face, paws, tail tip) are regions with their own strokes.
- Every open line is kept unchanged on the outline layer: body sides, leg line, toes, tail, ground, eyes, nose, mouth, whiskers.
- New fill-only `body`, `ground` and `background` regions sit behind those lines. Their hidden edges run under the mane and through the point where the paws meet.
- Strokes are 10 and the whiskers are 8, the minimum for ages 2–3. In the original the whiskers were about a third of the main line width.
- The ears were enlarged ×1.06 and the tail tip ×1.35 to clear the 0.4% minimum area.

The page has 10 regions. It is second in Animals, so the elephant stays the cover.

**Verified:** import and `page validate` report 0 errors and 0 warnings. Both previews were inspected against a render of the original. Typecheck, lint, and tests pass. On the iPad Pro 13" simulator the lion appears in the Animals grid. Its thumbnail showed saved coloring of the mane, face, body, paws, tail tip, ground and background, each filled separately.

## 2026-10-31: 30 Animals pages built from basic shapes

**Changed:**
- **New pages:** 30 Animals pages (`animal-<name>-01`), each a friendly animal made of circles, ovals, rounded triangles and rectangles, half circles and bumpy "scallop" shapes:
  - cat, dog, bunny, bear, pig, cow, sheep, chick, duck, owl;
  - mouse, panda, fox, frog, monkey, penguin, koala, hippo, tiger, giraffe;
  - zebra, turtle, snail, ladybug, bee, butterfly, caterpillar, hedgehog, horse, bird.
- **Style:** matches the hand-drawn elephant and lion: a big head, shiny locked eyes, pink cheeks, a smile, and a small scene (sun, cloud, ground; a pond for the duck and frog; a night sky for the owl). All pages are ages 2–3. The subtitle names the shapes the animal is made of.
- **Generator:** `tools/animals/generate.ts`. Shape helpers and the SVG writer were moved out of `tools/shapes/generate.ts` into `tools/art/primitives.ts` and `tools/art/layered.ts`. The regenerated Shapes SVGs are byte-identical.
- **Ground:** the ground is a fill without an outline, with a separate hilltop line, so page thumbnails show no edge lines.
- **Order:** Animals now has 32 pages, listed alphabetically by id, so the bear is the catalog cover instead of the elephant.

**Verified:**
- All 30 pages import with 0 errors and 0 warnings. `page validate` passes for 69/69 pages.
- Typecheck and lint pass. Tests pass 153/153, including the bundled-page checks.
- Contact sheets of all 30 blank previews were reviewed. The weakest designs were then redrawn:
  - horse and zebra, as front-facing sitters;
  - fox cheeks, penguin flippers, owl belly, cow spot, bird wing, ladybug and butterfly eyes, hedgehog spikes.
- iPad Pro 13" simulator: the Animals grid shows the new pages and scrolls.

**Not verified:** tapping to fill on the new pages in the simulator.

**Next:** decide whether the elephant should stay the Animals cover. That needs a page order or cover setting, because pages are currently sorted by id.

## 2026-10-31: Animals redrawn as friendly buddies in mixed poses

**Why:** the owner found the 30 shape-built animals ugly and unfriendly. Over several rounds of samples they asked for:
- animals that feel more human;
- no clothes;
- no overlapping shapes;
- no pink cheeks or other default pink;
- scenery that changes from page to page, with birds like the app background;
- mixed poses.

**Changed:**
- **Animals:** `tools/animals/generate.ts` was rewritten and all 30 Animals pages were re-imported (ids unchanged, each still version 1).
  - Standing: cat, bunny, bear, monkey, penguin, zebra.
  - Sitting: dog, sheep, panda, tiger, hedgehog, frog.
  - Lying down: pig, fox, mouse.
  - Peeking over a bush: cow, koala, horse, giraffe. Peeking out of water: hippo.
  - Natural poses: chick, duck, owl, turtle, snail, ladybug, bee, butterfly, caterpillar, bird.
  - Bodies are single smooth plush-toy outlines, and smaller parts sit inside their parent shape.
  - Subtitles are short stories ("Teddy has a balloon!").
- **Scenery:** chosen per page from the animal's name. The sun and a cloud sit on opposite sides, with birds, a different hill, and flowers or grass tufts. All of it keeps clear of the animal.
- **Importer (`tools/lcw/svgPage.ts`):**
  - Parts of one region now hide each other's outlines both ways, so a merged region has one outline and no seams. Before, the later part's outline cut through the region; that caused the "overlapping shapes" look.
  - It warns when a region's parts are traced in opposite directions, because their overlap would be an unfillable hole. A mirrored cat ear had this problem.
  - New tests cover both.
- **Renderer:** `PageArtwork` clips to the page. The generated ground is now a normal outlined shape whose edges fall off the page, so the hill line no longer runs across the animals' feet.
- **Generated SVGs** (`tools/art/layered.ts`) write every region white, as the app shows it. Re-importing the Shapes pages reported "No changes".
- **Generator options:** `--only` and `--out` (see ARTWORK_PIPELINE.md).

**Verified:**
- All 30 pages import with 0 errors. The only warning was "region ids removed", expected while replacing the never-shipped pages.
- Contact sheets of all 30, rendered through the real importer and previewer, were reviewed. The weakest designs were fixed: fox, duck, penguin, hedgehog, pig, bird and owl, plus the small-area warnings.
- Re-importing the hand-drawn pages after the importer change gave "No changes". The dinosaur changed only because it had never been re-imported since export; that change was reverted.
- `page validate` passes for 69/69 pages. Typecheck and lint pass. Tests pass 155/155.
- iPad Pro 13" simulator: the Animals grid shows the new pages, and the Fox page renders with its title and subtitle. The Happy Car still renders correctly with clipping.

**Not verified:** tapping to fill on the new pages in the simulator.

**Next:** the owner's verdict on the 30. The five hand-drawn pages with pink cheeks (elephant, car, dolphin, unicorn, dinosaur) are untouched until the owner decides.

## 2026-10-31: No more peeking pose

**Changed:** The owner found the animals hiding behind a bush unattractive. The peeking pose was removed from `tools/animals/generate.ts`:
- cow, koala and horse now sit;
- the giraffe stands, with its neck tucked between its shoulders;
- the hippo lies down for a nap.

The five pages were re-imported (still version 1), and their subtitles were updated to match.

**Verified:** the importer previews of the five were reviewed. `page validate` passes for 69/69 pages. Tests pass 155/155, and lint passes.

**Open:** the owner also said the lion "and similar animals" look bad; which pages they mean is still to be confirmed.

## 2026-10-31: Animals in the kawaii figurine style (32 pages)

**Why:** the owner shared a reference sheet of kawaii animal busts and asked for animals like those. They approved samples in that style, asked for the animals to be bigger, and asked to keep the scenery.

**Changed:**
- **Generator:** `tools/animals/generate.ts` was rewritten. 32 Animals pages are now generated, including a new lion and elephant that replace the two hand-drawn pages; their sources are kept in `art/svg/animals/original/`.
- **Look:**
  - The mammals and birds are figurines with dot eyes, a small nose, a "w" smile and their own ears and markings.
  - Insects, the snail and the turtle keep their own shapes with the same faces.
  - Each animal is drawn 1.02–1.16× bigger about its feet (less for tall ears) through a transform. Its lines scale with it, so its outlines are slightly bolder than the scenery's.
- **Scenery:** clouds are now pushed clear of the animal's full reach, including big ears.
- **Inner-ear lines** sit inside the visible part of each ear, so no line crosses a head.
- **Writer:** `tools/art/layered.ts` lines can carry a transform.

**Verified:**
- All 32 import with 0 errors. The only warning was "region ids removed", expected while replacing never-shipped pages and the two hand-drawn ones.
- Contact sheets of all 32, rendered through the importer and previewer, were reviewed and fixed: clouds over ears, crossing inner-ear lines, the pig's ears, the elephant's face, and flowers near tails.
- `page validate` passes for 69/69 pages. Typecheck and lint pass. Tests pass 155/155.
- iPad Pro 13" simulator: the Animals grid shows the new pages. The new lion page opened with a child's saved coloring of the old lion still applied to the parts that share names (mane, body, ground, sky), so filling works on it.

**Next:** the owner's verdict on the full set. Order is alphabetical by id, so the bear is the cover.

## 2026-10-31: Brush tool, brush thickness and 24 colours on coloring pages

**Changed (owner request; settles open decision D6):**
- **Brush.** A paint bucket / brush switch tops the palette. With the brush, a one-finger drag paints a smooth stroke, and a tap makes a dot.
  - Each stroke stays inside the part where it started. It is clipped to that part's visible area, so it never covers a part drawn above it, such as an eye or a tummy patch. Outlines stay on top.
  - A second finger cancels the stroke.
  - Thickness: small, medium (default) or big, as three dots in the chosen colour, shown while the brush is on.
- **Colours:** 24 solid colours instead of 12, three to a row at the 64 pt toddler size, in a scrolling grid. The white swatch has an edge.
- **Engine** (`src/engine/coloring/history.ts`): `Stroke` and `Artwork` types, plus `stroke` and `erase` commands. Erasing a part clears its fill and its strokes, and undo restores them in their original order. Start over clears both and is undoable. Unit tests went from 26 to 34 for the coloring engine.
- **Saving:** artwork is saved as `{v:2, fills, strokes}`, and v1 rows (fills only) still load. Two new persistence tests. Theme-grid thumbnails show brush strokes.
- **Rendering:** `useSkiaPage().visibleArea` (Skia path difference, computed on first use per region) and `src/render/strokePath.ts` (smooth path through the midpoints, cached per stroke).
- **Icons:** `bucket` and `brush`.

**Verified:**
- Typecheck and lint pass. Tests pass 165/165.
- iPad Pro 13" simulator:
  - The palette shows the tool switch, 24 colours and the eraser. In brush mode it shows the three thickness dots in the chosen colour.
  - A test painting with three deliberately messy strokes was inserted into the simulator database and the page opened. A zigzag started on the cat's head was cut off at the head's edge, a stroke on the body stopped at the tummy, and a wave in the sky only showed around the cat. The test row was then deleted.
  - The owner's own saved painting was untouched. It had already been re-saved in the new v2 format by the running app.

**Not verified:** finger drawing itself. There is no touch injection on this simulator setup, so dragging, dots, cancel with a second finger, and drawing performance need a manual check on a device or simulator.

**Next:** a freehand stroke eraser if wanted (the region eraser covers strokes for now). Long strokes are saved inline in SQLite; ARCHITECTURE.md's 64 KB file threshold for stroke data is not implemented yet.

## 2026-10-31: Pictures fill their cards (no white frame)

**Changed:** The owner saw a white border and margin around every picture. It came from layout, not from the SVGs:
- **Coloring screen:** the canvas had 12 pt of padding, and the card's shape differed from the page's 4:3, so the page was letterboxed with white bands. The card is now sized to the page's exact shape plus its lip, and the canvas has no padding (`ColoringScreen`, `ColoringCanvas`).
- **Theme grid:** page tiles had 14 pt of card padding. `CatalogCard` gained `bleed`, and `PageThumbnail` gained `fit="cover"` (new `fitCover` in `src/engine/geometry/viewTransform.ts`). The page tiles use both.

**Verified:** typecheck and lint pass. Tests pass 166/166, including a new `fitCover` test. iPad Pro 13" simulator: the Bear coloring page fills its card edge to edge, and the Animals grid tiles fill to their blue borders.

## 2026-11-01: Animals are the owner's 15 kawaii clipart animals

**Changed:**
- **Pages:** at the owner's request, all previous Animals pages were removed and replaced by 15 pages made from their "Cute Animal Faces Clipart Bundle": penguin, dog, cat, cow, owl, koala, frog, bunny, squirrel, walrus, bear, deer, panda, tiger and lion.
  - 20 pages were deleted: bee, bird, butterfly, caterpillar, chick, duck, elephant, fox, giraffe, hedgehog, hippo, horse, ladybug, monkey, mouse, pig, sheep, snail, turtle and zebra.
  - The 15 shared ids were overwritten, still at version 1.
  - The owner's own drawings are kept in `art/svg/animals/original/`, together with `lion.svg`.
  - The clipart sources are in `art/svg/animals/source/`.
- **Generator:** `tools/animals/generate.ts` was rewritten as a clipart converter (see ARTWORK_PIPELINE.md). The scenery code is unchanged, so the backgrounds look as before.
- **Parts:** each page has 3–8 fillable animal parts plus the scene. Holes below the toddler minimum stay white, for example the cat's inner ears, the frog's cheeks, the tiger's muzzle and the owl's beak.

**Verified:**
- All 15 import with 0 errors.
- Contact sheets of the blank and debug previews, rendered through the real importer, were checked against the clipart.
- `page validate` passes for 52/52 pages. Typecheck and lint pass. Tests pass 149/149; the count fell because there are fewer bundled pages to check.
- Animals JSON totals 864 KB (about 57 KB per page).
- iPad Pro 13" simulator: the Animals grid shows the new pages, and the Squirrel page renders crisply. Existing saved colorings with matching part names (sky, ground) carried over on the bear, dog and lion.

**Open:**
- **License (blocking release):** the bundle contains no license file. The owner must confirm that its license allows use in a paid App Store app. Recorded in `art/PROVENANCE.md`.
- **Tap targets:** tapping exactly on a thick black line fills the area behind the animal, because the line is a locked detail and taps pass through it.

## 2026-11-01: Animal lines match the scenery

**Changed:** The owner found the animals' lines far heavier than the background's. The clipart's own lines measure 9–12 units on the page (median per page), close to the scenery's 10. The conversion was adding a 10-unit outline on every part and an 8-unit edge on the black art, which roughly doubled every line. Both were removed. Parts are now unoutlined and grown 2 units outward under the black line (`grow`, `TUCK` in `tools/animals/generate.ts`), so colours still meet the lines with no hairline. Curves are sampled every 2 units so the grown edges stay smooth.

**Verified:**
- All 15 pages re-import with 0 errors and 0 warnings. `page validate` passes for 52/52 pages. Typecheck and lint pass. Tests pass 149/149.
- A zoomed debug render of the tiger with every part filled shows no seam.
- iPad Pro 13" simulator: the Tiger page's lines match the sun, cloud and hill.

## 2026-11-01: Dinosaurs from owner clipart

**What changed:**
- The single hand-drawn Stegosaurus page was replaced by 25 pages made from the owner's dinosaur clipart (`tools/dinosaurs/generate.ts`), each in a jungle scene. The owner picked the jungle style (one palm tree, clouds) from three samples (volcano, jungle, lake).
- The clipart converter moved to `tools/art/clipart.ts`, shared by Animals and Dinosaurs. The Animals output is byte-identical after the move.
- The dinosaurs' heavier lines are thinned to the Animals line thickness. Solid black spots and stripes are opened up so children can colour them; eyes stay black.
- The hit-test tests now use the old stegosaurus page as a fixture (`src/engine/coloring/fixtures/`), not bundled content.
- The clipart licence for a paid app is still to be confirmed by the owner (art/PROVENANCE.md).

**Verified:**
- All 25 pages import with 0 errors and 0 warnings. `page validate` passes for 76/76 pages. Typecheck and lint pass. Tests pass 173/173.
- Debug renders show the opened stripes and spots filling with their part, with no seams.
- iPad Pro 13" simulator: the Dinosaurs catalog shows the new pages.

**Next:** owner review of the 25 pages; licence confirmation.

## 2026-11-01: Raptor: every part colourable (trial page)

**What changed:**
- New converter `addClipartRegions`: closing lines per page, one region per white area, small far limbs join their
  nearest small neighbour, opened ridges/spots become individual `small-N` regions.
- Schema: optional `Region.small`; validator allows small parts down to 0.01% of the page; importer sets it for ids
  starting with `small-`. Tests added for both.
- Only `dino-raptor-01` is re-imported (age band 4-5). The other 24 dinosaur pages are unchanged until the owner
  approves the raptor.

**Verified:** raptor imports with 0 errors, 0 warnings; 76/76 pages valid; typecheck, lint, 175/175 tests pass. Hit test
on the page: each of the 4 back ridges, the head/body, near leg, and both arms resolve to their own regions.

**Next:** owner tests the raptor on the iPad, then the same per page for the other 24.

## 2026-11-01: All dinosaurs colourable part by part

**What changed:**
- All 25 dinosaur pages use the rules approved on the raptor: closing lines per page (legs, arms, necks, frills, wing),
  every spike, plate, spot and ridge its own region, line-thick outlines, no solid black except eyes, jungle scene with
  one palm, clouds and soft bushes. Pages are age band 4-5.
- Converter fixes found along the way: eyes told apart from spots and open mouths, thin eyebrows kept as lines,
  crescent-shaped spots, a raster check against a Skia path-op glitch.
- Known limit: the pteranodon's far wing colours with its head and body (a closing line would cut past the eye).

**Verified:** all 25 import with 0 errors; 76/76 pages valid; typecheck, lint and 175/175 tests pass. Every page
reviewed in a coloured region overlay and a blank render.

**Next:** owner tests on the iPad; clipart licence still to confirm.

## 2026-11-01: Dinosaurs without bushes; egg baby removed

**What changed:** the jungle scene no longer draws bushes. The baby hatching from an egg (`dino-baby-01`) was removed at the owner's request (its source `art/svg/dinosaurs/source/11.svg` is kept). 24 dinosaur pages remain.

**Verified:** all 24 import with 0 errors; 75/75 pages valid; typecheck, lint and 174/174 tests pass.

## 2026-11-01: Plesiosaurus under the sea

**What changed:** new `sea` scene style in `tools/dinosaurs/generate.ts` (sky strip with sun and cloud, wavy sea surface, columns of bubbles kept clear of the swimmer; bubbles under 20 units are `small-` parts). The plesiosaurus uses it instead of the jungle.

**Verified:** imports with 0 errors; 75/75 pages valid; typecheck, lint and 174/174 tests pass.

## 2026-11-02: 30 vehicles

**What changed:** 30 vehicle pages from the owner's clipart (`tools/vehicles/generate.ts`), age band 4-5, every closed shape colourable. The owner picked the Happy Car road background (option A of three) with added birds and small clouds; boats are on the sea, aircraft in the sky, the submarine under the sea, trains on rails, the snowmobile in snow (no pine trees, at the owner's request) and the tractor on a farm. New `eyes: false` option in `addClipartRegions` so round windows are coloured. The four existing vehicle pages (Happy Car, Road, Ovals, Rectangles) are kept.

**Verified:** all 30 import with 0 errors and 0 warnings; 105/105 pages valid; typecheck, lint and 204/204 tests pass. Every vehicle reviewed in a coloured region overlay; no closing lines needed.

**Next:** owner review on the iPad; clipart licence to confirm.

## 2026-11-02: Old vehicle pages removed

**What changed:** removed the Road Trip, Ovals and Rectangles pages at the owner's request (`vehicle-road-01`, `vehicle-ovals-01`, `vehicle-rectangles-01`). The owner's original drawings are kept in `art/svg/vehicles/original/`. Vehicles now has Happy Car plus the 30 clipart vehicles.

## 2026-11-02: Vehicle backgrounds refined; Happy Car removed

**What changed:** at most two clouds per vehicle page (the Happy Car cloud plus one small one; two in the sky scene). The steam train (front view) now runs down a track that narrows to the horizon (`track` setting). The tricycle is in a playground with a swing set and a slide (`playground` setting). The Happy Car page (`vehicle-car-01`) was removed at the owner's request; its drawing is kept in `art/svg/vehicles/original/`. Vehicles now has the 30 clipart pages.

**Verified:** all 30 import with 0 errors; no page has more than two clouds; 101/101 pages valid; typecheck, lint and 200/200 tests pass.

## 2026-11-02: Sea Animals, 100 pages

**What changed:** 100 Sea Animals pages from the owner's clipart (`tools/sea-animals/generate.ts`, ids `sea-<name>`), age band 4-5, every closed shape colourable. Minimal backgrounds as asked: a seabed and a few bubbles for swimmers, sand only for shore animals, and none for pictures that already have scenery (or are plants, shells or boats). The existing "Happy Dolphin" page (`sea-dolphin-01`) is kept, so the new dolphins are numbered 02 to 04. One source is left out: the solid-black orca (37) does not convert cleanly; the other orca is used. Converter: new `minCore` and `maxRegions` options (other generators unchanged, defaults keep their output identical). Schema: `outline` may now be empty when a locked region (the clipart artwork) draws the lines; validation still requires one or the other, the importer checks the same, and the canvas tap tolerance handles no outline strokes.

**Verified:** all 100 import with 0 errors; `page validate` shows 0 warnings for every sea page; 201 bundled pages; typecheck, lint and 301/301 tests pass (new test: no outline strokes allowed only with locked artwork). All pages reviewed in rendered contact sheets; app-renderer previews checked for a no-background page (`sea-mermaid-04`) and its region overlay.

**Next:** owner review on the iPad; clipart licence to confirm.

## 2026-11-02: Insects replace Princesses

**What changed:**
- The Princesses catalog (which had no pages) is now **Insects** (`content/themes.json`, same purple accent, 🐞).
- There are 33 insect pages from the owner's "Cute Insect SVG" pack (`tools/insects/generate.ts`, ids `insect-<name>`, sources in `art/svg/insects/source/`), age band 4-5, with every closed shape colourable.
- As asked, there is no background: each bug is drawn big and centred on the page. The converter has a new optional `centerY` fit for this.
- The pack's 14 scenery pieces (apple, bush, cloud, 8 flowers, leaf, 2 mushrooms) are copied but not used.

**Verified:**
- All 33 pages import with 0 errors and 0 warnings, and there are 234 bundled pages.
- Typecheck and lint are clean, and 334/334 tests pass.
- All pages were reviewed in region-overlay contact sheets.

**Next:** owner review on the iPad; clipart licence to confirm.

## 2026-11-02: Unicorn pack replaces the Rainbow Unicorn

**What changed:**
- The hand-drawn `unicorn-rainbow-01` page has been removed, along with its JSON, SVG and previews.
- The Unicorns catalog now has 14 pages from the owner's "Unicorn Bundle" (`tools/unicorns/generate.ts`, ids `unicorn-01` to `unicorn-14`, sources in `art/svg/unicorns/source/`), age band 4-5, with every closed shape colourable.
- As asked, there is no background: each unicorn is drawn big and centred, the same way as Insects.
- `loadClipart` has a new opt-in `dedupe` option. Some pack files stack the same outline hundreds of times; Svg-07 is 278 KB. That made the converter hang, and leftover copies hollowed out eyes. Copies are now matched within 1.5 units and 3% of area, because many repeats start at a different point or are shifted by about 0.08.
- `unicorn-07` uses `minCore: 900`. At that value its small black hooves become colourable and the half-hidden far eye stays black.
- The owner reported that the nostrils on 01, 07 and 10 were too thick. There is a new opt-in `thinSpots` option in `addClipartRegions`: a spot too small to centre a line on is redrawn as a 5-unit ring inside its own edge, not with a full line around it. The unicorn pages use it and were regenerated fresh, all version 1.

**Verified:**
- All 14 pages import with 0 errors and 0 warnings, there are 247 bundled pages, and all 247 validate.
- Typecheck and lint are clean, and 347/347 tests pass.
- Each page was reviewed in plain and region-overlay contact sheets, with zoomed checks of the eyes and hooves on 07 and 08.

**Next:** owner review on the iPad; clipart licence to confirm.

## 2026-11-02: Catalog is a 3×3 grid with chosen covers

**What changed:**
- The theme catalog is now a 3×3 grid (`CATALOG_COLUMNS`/`CATALOG_ROWS` in `paging.ts`), with each card sized to fit three rows. The ◀ ▶ arrows are hidden for now; swiping still pages.
- There is a new optional theme field `cover`, a page id, resolved by `themeCover()` in `registry.ts`, which falls back to the first page. Covers: panda, school bus, smiling T-rex, flying unicorn (14), happy butterfly (03), clownfish.
- `PageThumbnail` has a new `zoom` prop (`zoomAbout` in `viewTransform.ts`). Catalog covers use 1.18.

**Verified:**
- Typecheck and lint are clean, and 351/351 tests pass, including new tests for `zoomAbout` and theme covers.
- I checked the screen in the iPad Pro 13" simulator: there are no arrows, covers show, and the six themes sit in two centred rows of a 3×3 grid.

**Next:** owner review of the cover choices.

## 2026-11-02: Catalog fixes, three new themes, coral removed

**What changed:**
- The ◀ ▶ arrows are back on the theme catalog.
- Covers are no longer cropped. The 1.18× zoom has been replaced with a new `PageThumbnail fit="content"`, which fits the drawing's own bounds (all regions but `background`, plus outlines) using the new pure `fitContainRect`.
- Covers: Insects is now Happy Butterfly (insect-butterfly-01), and Sea Animals is now the orca (`sea-orca`).
- There are three new themes with no pages yet: Space 🚀, Food 🍩 and Christmas 🎄. Their cards show the dashed empty slot, and the theme screen says "New pictures are coming soon". This is a stub until artwork is added.
- The three coral pages (`sea-coral-01` to `sea-coral-03`) have been removed: their JSON, generated SVGs, previews, generator entries and provenance rows. The sources are kept in `art/svg/sea-animals/source/`.
- `insect-butterfly-03`: the closed eyes are thinner. The new `spotLine` option in `addClipartRegions` sets the outline width of opened solid spots, and this page uses 5. It was re-imported fresh as version 1.

**Verified:**
- Typecheck and lint are clean, and 350/350 tests pass, including new tests for `fitContainRect` and empty-theme covers.
- 244/244 pages are valid.
- I checked the screen in the iPad Pro 13" simulator: there is a full 3×3 grid, the arrows are back, and the covers are uncropped.

**Next:** artwork for Space, Food (the owner has a "Cute Food" pack in Downloads) and Christmas.

## 2026-11-02: Space pages (61 from the pack)

**What changed:**
- The Space theme has 31 pages from the owner's "Space SVG" pack (`tools/space/generate.ts`, ids `space-01` to `space-31`, sources in `art/svg/space/source/`), age band 4-5, with every closed shape colourable.
- As with Unicorns, there is no background: each picture is drawn big and centred. The pages use `dedupe` and `thinSpots: 5`.
- The pictures are astronauts, rockets, stars, comets, the sun, the moon, planets, Earth, a fluffy monster and an alien.
- The Space cover is `space-70` (Solar System), so the Space card is no longer an empty slot.
- `registry.test.ts`: the "no cover for an empty theme" check now uses Food.
- Space-01 to Space-31 (the files the owner attached) plus a chosen subset of 30 from Space-32 to Space-120, picked for new subjects: aliens, UFOs, animal astronauts (kitty, puppy, panda, fox, penguin, frog), planet characters, solar system, galaxy, moon rainbow, telescope, satellite, space station, rover, robot, moon camping, a high five, alien rocket, star ship, astronaut friends. Left out: near-repeats of 01-31, very busy scenes (35, 69, 109, 110), the "I am astronaut" text page (118), dotted constellations (77, 78) and big solid-black areas (74, 104, 111).
- `tools/art/clipart.ts`: small regions (`small-N`) are now written with their contours wound consistently (`windConsistently`). Path operations could leave a spot's separate pieces winding opposite ways; that fills fine but cancels the signed area the validator measures, so space-54 and space-98 failed as "Region too small". The geometry is unchanged; regenerating older pages changes only the order of points in such paths.
- **Bug found, not fixed:** `addClipartRegions` counts its parts twice in the small-part budget (`maxRegions - names already added (which include the parts) - parts`), so pages with many parts get no cap. Fixing it would change the regions of existing pages the next time they are regenerated, so the rover (`space-86`) uses `maxRegions: 117` instead.
- `space-04` (Moon Jump): the dark helmet visor stays solid black, as drawn.

**Verified:**
- All 61 pages import with 0 errors and 0 warnings, and all 305 bundled pages validate.
- Typecheck and lint are clean, and 381/381 tests pass.
- Every page was reviewed in plain and region-overlay contact sheets.

**Next:** owner review on the iPad; decide whether to fix the region-budget bug (with a planned regeneration); clipart licence to confirm.

## 2026-11-02: Theme covers show the child's colouring

**What changed:**
- The Space cover is now `space-70` (Solar System).
- On the theme picker, each card's cover shows the child's unfinished colouring of that picture (`ThemeCard` in `CatalogPager.tsx`), loaded on focus with `findInProgressColoring`, the same way the page grid shows progress. A cover that hasn't been coloured stays plain.

**Verified:**
- Typecheck and lint are clean, and 411/411 tests pass.
- Not yet checked in the simulator. Manual check: colour part of the Solar System page, go back to the theme picker, and the Space card should show those colours.

**Next:** owner check on the iPad.

## 2026-11-02: Dinosaurs replaced by the Cute Dino pack

**What changed:**
- The 24 scene-based dino pages (`dino-<name>-NN`) have been removed: their JSON, generated SVGs, previews and provenance rows. Their clipart sources (`art/svg/dinosaurs/source/`, `original/`) are kept, and their generator is now `tools/dinosaurs/scenes-legacy.ts`, marked as legacy.
- The Dinosaurs theme now has 30 pages from the owner's "Cute Dino" pack, Cute Dino-01 to Cute Dino-30 (`tools/dinosaurs/generate.ts`, ids `dino-01` to `dino-30`, sources in `art/svg/dinosaurs/cute-source/`), age band 4-5, with every closed shape colourable.
- As asked, there is no background: each dinosaur is drawn big and centred, like Unicorns. This replaces the earlier rule of a jungle scene with one palm.
- The Dinosaurs cover is now `dino-02` (T-Rex).
- `tools/lcw/svgPage.test.ts`: the export round-trip now uses `dino-27` (Stegosaurus), because `dino-stegosaurus-01` is gone.
- Saved colourings of the removed pages stay in the database but no longer show.
- The pack folder has 85 files; only the 30 the owner attached were converted.

**Verified:**
- All 30 pages import with 0 errors and 0 warnings, and the bundled index has 311 pages.
- Each page was reviewed in region-overlay contact sheets.
- Typecheck and lint are clean, 417/417 tests pass, and all 311 pages validate.

**Next:** owner review on the iPad; decide on Cute Dino-31 to Cute Dino-85; clipart licence to confirm.

## 2026-11-02: 24 more Cute Dino pages (subset of 31-85)

**What changed:**
- The owner asked for a subset of Cute Dino-31 to Cute Dino-85 to be picked. 24 were added to `tools/dinosaurs/generate.ts`: 31, 32, 33, 34, 37, 38, 39, 43, 49, 57, 59, 61, 62, 63, 64, 65, 66, 67, 68, 72, 73, 77, 78, 85.
  - These are the dinosaurs, plus three dino-world pictures: Volcano (39), Dino Nest (43) and Dino Triplets (85).
  - Same conversion as 01-30: no background, big and centred.
- Left out:
  - lone props (eggs, leaves, clouds, stars, rocks, sun, footprints, grass);
  - the two busy full scenes, 55 (ROAR) and 56 (cave), which are too detailed for ages 4-5;
  - near-repeats of 01-30: 58, 60, 71 and 79.
- Sources were copied to `art/svg/dinosaurs/cute-source/`, and provenance rows were added. The clipart licence is still to be confirmed by the owner.
- Dinosaurs now has 54 pages.

**Verified:**
- All 24 pages import with 0 errors and 0 warnings, and the bundled index has 335 pages, all valid.
- All 24 were reviewed in a region-overlay contact sheet.
- Typecheck and lint are clean, and 441/441 tests pass.

**Next:** owner review on the iPad; clipart licence.

## 2026-11-02: Animals replaced by the cute animal pack (no background)

**What changed:**
- The 15 scene-based animal pages (`animal-<name>-01`) were removed, along with their JSON, generated SVGs, previews and provenance rows. Their clipart sources (`art/svg/animals/source/`, `original/`) are kept, and their generator is now `tools/animals/scenes-legacy.ts`, marked as legacy.
- The Animals theme now has the 20 pages the owner attached (MeadMor0074–0124), made by `tools/animals/generate.ts` (ids `animal-01` to `animal-20`, sources in `art/svg/animals/cute-source/`), age band 4-5.
  - Every closed shape is colourable.
  - As asked, there is no background: each animal is big and centred, like Dinosaurs.
- The Animals cover is now `animal-09` (Dancing Elephant), to match the 🐘 card.
- Saved colourings of the removed pages stay in the database but no longer show.
- The clipart licence still needs confirming by the owner.

**Verified:**
- All 20 pages import with 0 errors and 0 warnings, and the bundled index has 340 pages, all valid.
- All 20 were reviewed in a region-overlay contact sheet.
- Typecheck and lint are clean, and 446/446 tests pass.

**Next:** owner review on the iPad; clipart licence.

## 2026-11-02: Animal eyes fixed (Little Bull, Piglet in a Basket, Tortoise, Party Puppy)

**What changed:**
- On each of these four pages, the clipart converter guessed the eyes wrongly and opened one solid black eye into a colourable ring:
  - Party Puppy: the nose was bigger than an eye, so it took an eye's place.
  - Tortoise: the eye's highlight is just over a quarter of the eye.
  - Little Bull: the lidded eye has no highlight.
  - Piglet in a Basket: the two eyes were too far apart to count as a pair.
- `addClipartRegions` (`tools/art/clipart.ts`) has a new option, `eyeAt`: points in the source drawing that mark the shapes to keep solid black. It fails loudly if a point misses.
- The four pages set it in `tools/animals/generate.ts`; the puppy's nose is marked too.

**Verified:**
- Face crops of the source and the output were compared side by side: every eye is now solid with its highlight, and the puppy's nose is black again.
- All 340 pages are valid, typecheck and lint are clean, and all tests pass.

## 2026-11-02: Christmas catalog (30 kawaii Christmas pages, no background)

**What changed:**
- The Christmas theme, until now empty, has the 30 pictures the owner attached from the "400+ Kawaii Christmas" pack (files 7, 25, 31 … 315; the pack's `selected/` folder).
- `tools/christmas/generate.ts` makes them (ids `christmas-01` to `christmas-30`, sources in `art/svg/christmas/source/christmas-<pack number>.svg`), age band 4-5. They are converted like the Unicorns: every closed shape colourable, **no background**, each picture big and centred.
- Little Reindeer (05) uses `minCore: 600` so its black hooves become colourable; only eyes stay solid black.
- The Christmas cover is `christmas-11` (Christmas Tree), to match the 🎄 card.
- Provenance rows were added. The clipart licence still needs confirming by the owner.

**Verified:**
- All 30 pages import with 0 errors and 0 warnings, and the bundled index has 370 pages, all valid.
- All 30 were reviewed in region-overlay contact sheets.
- Typecheck and lint are clean, and 476/476 tests pass.

**Next:** owner review on the iPad; clipart licence.

## 2026-11-02: Christmas eyes fixed (Santa, Busy Elf, Snowman Snow Globe, Sitting Reindeer)

**What changed:**
- The converter guessed these eyes wrongly:
  - Santa and Busy Elf: the closed, smiling eyes were turned into colourable shapes.
  - Snowman Snow Globe and Sitting Reindeer: the nose was taken as an eye, so one eye was opened into a colourable ring.
- `tools/christmas/generate.ts` now passes `eyeAt` (source units) for these four pages, so every eye stays solid black. The noses are colourable again.
- Santa (`christmas-01`, version 2) lost two eye regions (`small-13`, `small-14`) and was imported with `--allow-removed`. The page was only added today.

**Verified:**
- The four region overlays were checked: all eight eyes are solid black with their highlights.
- 370/370 pages are valid, typecheck and lint are clean, and 476/476 tests pass.

## 2026-11-02: Christmas Teddy Bear replaced by Waving Bear

**What changed:**
- At the owner's request, `christmas-09` is now the Waving Bear (pack file 66, source `art/svg/christmas/source/christmas-066.svg`) instead of the Teddy Bear (pack file 72). Its eyes are pinned with `eyeAt`.
- The page id is kept, so it was imported as version 2 with `--allow-removed`. Saved colourings of the old teddy lose their fills, but the page was only added today.
- The old source `christmas-072.svg` is still in `art/svg/christmas/source/` but is no longer used.

**Verified:**
- The region overlay was checked: both eyes are solid black with highlights, and every other part is colourable.
- 370/370 pages are valid, typecheck and lint are clean, and 476/476 tests pass.

## 2026-11-02: Food catalog (50 cute food pages, no background)

**What changed:**
- The Food theme, until now empty, has the 50 pictures the owner attached from the "Cute Food Doodles" pack (`~/Downloads/CuteFood/Selected`).
- `tools/food/generate.ts` makes them (ids `food-01` to `food-50`, sources in `art/svg/food/source/food-<pack number>.svg`), age band 4-5. They are converted like Christmas: every closed shape colourable, **no background**, each food big and centred.
- The converter opened small solid eyes into rings on ten faces. Those pages pin their eyes with `eyeAt`: 01, 13, 15, 18, 19, 20, 22, 45, 49, 50.
- Gingerbread Man (45): the very thick outline made line-thinning erase the smile, buttons and icing. `Pic.target` (passed to `addClipartRegions`) is now 20 for that page.
- The Food cover is `food-03` (Big Donut), to match the 🍩 card.
- Provenance rows were added. The clipart licence still needs confirming by the owner.
- `registry.test.ts` used Food as its "theme with no pages" example. Every theme now has pages, so the test uses a made-up theme id.

**Verified:**
- All 50 pages import with 0 errors, and the bundled index has 420 pages, all valid.
- All 50 were reviewed in region-overlay contact sheets, and the fixed faces were also checked close up.
- Typecheck and lint are clean, and 526/526 tests pass.

**Next:** owner review on the iPad; clipart licence.

## 2026-11-02: Busy Elf cheek circles removed

**What changed:**
- At the owner's request, the two small cheek circles below the Busy Elf's eyes (`christmas-02`) are gone.
- A new helper, `dropRings` in `tools/art/clipart.ts`, leaves out a small ring (its outline and its hole) at a given source point, and fails loudly if the point misses.
- The Christmas generator has a `dropRings` field for each picture.
- `christmas-02` is now version 3 (imported with `--allow-removed`; the two cheek regions are gone).

**Verified:**
- A face crop shows the cheeks gone, with the eyes, lashes, nose and smile unchanged.
- 420/420 pages are valid, typecheck and lint are clean, and all tests pass.

## 2026-11-02: Five Food pages removed

**What changed:**
- At the owner's request, these pages were removed: Dumplings (`food-25`), Gingerbread Man (`food-45`), Chocolate Bar (`food-46`), Popcorn (`food-49`) and Spaghetti (`food-50`).
- For each, the entry in `tools/food/generate.ts`, the page JSON, the generated SVG, the previews and the provenance row were deleted. The page numbers are not reused.
- The source files stay in `art/svg/food/source/`.
- Dumpling Bowl (`food-39`) is kept.
- Food now has 45 pages.

**Verified:**
- No remaining references to the removed ids.
- The index has 415 pages, all valid.
- Typecheck and lint are clean, and 521/521 tests pass (the count dropped by one test per removed page).

## 2026-11-02: Patterns, rainbows, star celebrations and the camera

**What changed (owner request):**
- **Fill styles:** `FillStyle` now also has `linear` gradients and `pattern` fills (src/content/schema/fill.ts). The change is additive, so saved solid-colour art still loads.
  - Gradients are laid across each region's bounds (`gradientEnds`, src/engine/fills).
  - Patterns come from one SkSL runtime effect (src/render/patternShader.ts) with eight patterns: dots, stripes, checks, zigzag, hearts, stars, waves and grid.
  - `FillShader` paints them as children of the region `<Path>`, with no clip stacks.
- **Palette tabs** (bucket only):
  - Colours: 48 swatches, up from 24.
  - Patterns: the eight patterns, each drawn in the colour picked last. Very light colours flip to a darker shade on top.
  - Rainbows: 12 rainbows.
  - The brush always paints the plain colour. `Tool` now holds `color` (the current colour) and `choice` (what the bucket pours).
- **Celebrations:**
  - Every bucket fill pops a ring of stars at the tapped spot and gives a light haptic.
  - The fill that colours the last required part (every part except locked and `small` ones) starts a 2.6 s star shower across the whole screen and a success haptic. It never fires on load, undo or redo.
  - Reduce Motion: stars only fade.
  - Code: `Celebration.tsx` and `celebrationStars.ts` (pure); `completion.ts` in the engine.
- **Camera:** a pink camera button in the top bar.
  - Tapping it gives a white flash and a medium haptic, then shows the picture big (rendered off screen at 2×, 2048 × 1536).
  - ✕ goes back. ✓ saves to Photos through `expo-media-library` (add-only access, `photosPermission: false`), then shows a green tick, a star shower and a success haptic, and closes.
  - If access is refused, small grown-up text says where to allow it.
  - Owner decision D10: no parent gate.
- **New dependency:** `expo-media-library` (the only way to write to Photos). `app.json` configures its plugin, and `ios/` was regenerated with `expo prebuild`. Info.plist gains only `NSPhotoLibraryAddUsageDescription`.
- **Docs:** ARCHITECTURE §4, §12 and §13; UX palette, haptics and celebrations; ROADMAP Phase 2 status and D10.

**Verified:**
- Typecheck and lint are clean, and 551/551 tests pass. New tests cover:
  - fill schema parsing, including legacy solid fills and unknown pattern ids;
  - gradient ends, pattern colours and the completion rule;
  - celebration star layouts;
  - the 48 unique colours;
  - saved pattern and rainbow fills;
  - the shader compiling and rendering all eight patterns under canvaskit-wasm.
- A canvaskit contact sheet of all patterns in red, blue and light yellow was checked by eye.
- iPad Pro 13" simulator (iOS 18.1): a fresh native build launches, and the coloring screen shows the camera button, the three tabs (the Patterns tab icon is drawn by the shader on iOS) and the 48-colour grid.

**Not yet verified by hand (needs taps on the simulator or an iPad):**
- Pattern and rainbow fills on a page.
- The star pop, and the shower on finishing a page.
- The camera preview, and saving to Photos (the permission prompt, then the photo appearing in Photos).
- Haptics, which need a real iPad with a Taptic Engine.

**Next:** owner review of these on the iPad.

## 2026-11-02: Reset confirms with a tap

**What changed:**
- The ✓ in the "start over" sheet now clears the picture on a single tap. Before, it needed a 1.5 s press-and-hold, which the owner found looked broken.
- Reset is still undoable, so an accidental tap can be recovered.
- ResetSheet now uses the same green `IconButton` as the camera preview.
- UX.md is updated.

**Verified:**
- Typecheck, lint and tests are clean.
- The tap needs checking by hand on the simulator or an iPad: ⟲ → ✓ should clear the picture, and Undo should bring it back.

## 2026-11-02: Star pop on brush strokes; fewer, bigger stars

**What changed (owner feedback):**
- Brush strokes now pop stars where the finger lifts. `ColoringCanvas` passes the finger's last position to `onStroke`.
- The pop is 5 stars, down from 9. They are 44–60 pt (were 18–30), fan out 70–110 pt, and last 1 s.
- Finishing the whole picture still counts bucket fills only: brush strokes don't fill a part.

**Verified:**
- Typecheck, lint and tests are clean; the star-layout tests now check the count and size.
- The look needs checking by hand on the simulator or an iPad.

## 2026-11-02: Picture card as tall as the palette

**What changed (owner request):**
- The coloring card now fills the space beside the palette, top to bottom. Before, it took the page's exact shape and sat shorter, centred.
- The page is centred inside the white card (`fitContain`). Superseded the same day: the page now covers the card (`fitCover`), see below.
- The card's lip now matches the palette's (`size.lip`), so their bottoms line up.

**Verified:** On the iPad Pro 13" simulator, the card and palette tops and bottoms line up. Typecheck, lint and 551/551 tests pass.

## 2026-11-02: More space between swatches

**What changed (owner request):** The selected swatch's ink ring touched its neighbours. Swatch cells are now 82 pt (were 72), and the selected swatch grows 1.1× (was 1.15×), which leaves about 11 pt between the ring and the next colour. The palette panel is 30 pt wider.

**Verified:** On the iPad Pro 13" simulator, the selected red has a clear gap to orange and green. Typecheck and lint are clean.

## 2026-11-02: Page covers the card (no white bands)

**What changed (owner report):** A coloured page background left white bands above and below the page, because the palette-height card is a different shape from the page. `ColoringCanvas` now uses `fitCover`, so the page fills the card edge to edge. Only a sliver of the page's side margin is cropped. Hit testing uses the same transform. The camera snapshot still saves the whole page.

**Verified:** On the iPad Pro 13" simulator, Little Leopard with a sunset background fills the card with no bands, and the whole leopard is visible. Typecheck and lint are clean.

**Watch:** On narrower iPads (11", mini), more of each side is cropped, up to about 4 % of the page width per side. Centred clipart has more margin than that. Scenes with art that runs to the page edge should be checked there.

## 2026-11-02: Big, colourful coloring-screen icons

**What changed (owner request):**
- **Top bar:** every button is 88 pt (was 80) with its own `ToyButton` tone: back blue, camera pink, undo orange, redo purple, start over yellow. Big `IconButton`s draw the icon at 56 % of the button with 6 pt lines.
- **Multi-colour icons:** icons can now give each path its own colour, and the colour 'accent' takes the Icon's `accent` prop (src/ui/icons.ts, src/ui/Icon.tsx).
- **New icons:** `bucketColor` (blue pail pouring a drop in the chosen colour), `brushColor` (wooden brush with the tip in the chosen colour), `eraserColor` (pink and blue) and `paletteColor` (wooden palette with four paint blobs, used for the Colours tab).
- **Palette tools:** the bucket, brush and eraser buttons are 86 pt tall (were 72) with 70 pt icons.

**Verified:** On the iPad Pro 13" simulator, the top bar shows the five coloured buttons, the tools show the coloured pail, brush and eraser, and the drop and tip match the chosen colour. Typecheck and lint are clean, and 551/551 tests pass.

## 2026-11-02: "Open Settings" after Photos is refused

**What changed (owner request):**
- iOS shows the add-only Photos prompt only once, so after "Don't Allow" every save is refused without a prompt.
- The camera preview's refused message now has a small grown-up "Open Settings" button. It calls `Linking.openSettings()`, which opens this app's page in Settings.
- If iOS does not restart the app after the change, the preview re-checks the permission when the app becomes active again and brings ✓ back.
- No gate (owner choice). The button is deliberately plain so it doesn't look like a child's toy button.

**Verified:**
- Typecheck, lint and tests are clean.
- Manual check needed on the simulator or an iPad: deny the prompt, tap ✓ again, tap "Open Settings", turn on Photos, come back, and confirm ✓ saves.
- To reset the prompt on the simulator: `xcrun simctl privacy booted reset photos-add app.littlecolorworld.ios`.

## 2026-11-02: Back buttons go up a fixed level

**What changed (owner report):** Back used `router.back()`, so after opening several pictures it walked back through every one. Each back button now goes to a fixed parent with `router.dismissTo`. That pops to the parent if it is in the history, and otherwise replaces the current screen with it, so history cannot pile up:
- coloring page → that picture's theme (`/themes/[themeId]`)
- theme → theme picker (`/themes`)
- theme picker → home (`/`)
- "Coming soon" screens → home

**Verified:**
- Typecheck, lint and tests are clean.
- Manual check needed: open several pictures, then tap back from a picture. It should go to its theme, then the theme picker, then home.

## 2026-11-02: Rubbing eraser for brush paint

**What changed (owner request):**
- With the eraser, **dragging** now rubs out brush paint under the finger, and only brush paint: bucket fills stay. **Tapping** a part still clears it completely, and a finger that moves less than 12 pt counts as a tap.
- **How it works:** a rub is a `Stroke` with `erase: true`, saved as a command and undoable like any stroke. `PageArtwork` draws all strokes in one layer above the fills, and eraser strokes use `blendMode="clear"`, so they remove only paint drawn before them.
- Clearing a part keeps eraser strokes, so paint rubbed out in a neighbouring part never comes back.
- A rub with no brush paint on the page is ignored.
- The saved stroke schema has an optional `erase` field, so older saves still load.

**Verified:**
- Typecheck and lint are clean, and 553/553 tests pass. New tests cover rubbing, clearing a part with eraser strokes, undo, and saving and loading eraser strokes.
- Manual check needed on an iPad: paint with the brush, drag the eraser over it, and confirm the paint goes while the fill underneath stays; Undo brings the paint back; a tap still clears the part.

## 2026-11-03: The eraser rub clears bucket colour too

**What changed (owner report: "eraser not working with bucket paint"):**
- Dragging the eraser only rubbed out brush paint, so rubbing over a bucket-filled part did nothing.
- Now every part the finger rubs over loses its bucket colour. Because bucket colour fills a whole part, the whole part goes back to its blank state, and it clears live while rubbing. Brush paint still rubs out only under the finger.
- One rub is one undo step: the `stroke` action takes `clearFills`, and the command stores the removed fills in `cleared` for undo.
- A rub over nothing coloured is ignored by the reducer.
- A tap with the eraser still clears one part.

**Verified:**
- Typecheck and lint are clean, and 555/555 tests pass. New tests cover a rub clearing crossed parts, undo and redo restoring them, and a rub over nothing not being an edit.
- Manual check needed on an iPad: fill parts with the bucket, rub the eraser across them, and confirm they clear as the finger passes; Undo brings them all back.

## 2026-11-03: New Monsters theme (40 pages)

**What changed (owner request: "create new theme Monsters and add these"):**
- New theme `monsters` ("Monsters", 👾, purple `#C46BD6`, order 10, cover `monster-08`) in `content/themes.json`.
- 40 pages `monster-01` … `monster-40` from the owner's "Cute Monsters" pack (`MonsChar001`–`MonsChar040`), converted by the new `tools/monsters/generate.ts` like the Food pages: no background, big and centred, every closed shape a part. Sources are in `art/svg/monsters/source/`.
- The pack's licence (`INFO/LICENSE.pdf`) allows commercial use in digital projects; it forbids reselling or redistributing the files as-is. Recorded in `art/PROVENANCE.md`.

**Verified:**
- All 40 pages import with 0 errors and 0 warnings; `lcw page validate` passes 455/455 pages. Typecheck and lint are clean, and 595/595 tests pass.
- I checked the preview of every page: every face keeps solid eyes, the drawings fill the page, and none has a background shape.
- Manual check needed on an iPad: open Monsters from the theme picker and colour a page or two.

## 2026-11-03: Monsters: three tall pages swapped for chunkier ones

**What changed (owner request):**
- Removed Pointy Ears (`monster-11`), Shaggy Tall (`monster-14`) and Lanky Lou (`monster-17`), with their page JSON, generated SVGs, previews, sources and provenance rows. Their numbers are not reused.
- Added three more from the same pack: Happy Blob (`monster-41`, MonsChar048), Three Eyes (`monster-42`, MonsChar054) and Curly Horns (`monster-43`, MonsChar064). The theme still has 40 pages.

**Verified:**
- The new pages import with 0 errors and 0 warnings, and their previews show solid eyes and no background. `lcw page validate` passes 455/455 pages; typecheck and lint are clean; 595/595 tests pass.
- Manual check needed on an iPad: open Monsters and confirm the three new pictures are at the end of the list.

## 2026-11-03: Theme picker order

**What changed (owner request):** Vehicles and Food now come last in the theme picker. The order is Animals, Dinosaurs, Unicorns, Insects, Sea Animals, Space, Christmas, Monsters, Vehicles, Food (`order` in `content/themes.json`).

**Verified:** typecheck and lint are clean; 595/595 tests pass. Simulator screenshot of the theme picker below.

## 2026-11-03: Dinosaurs cover is Sail Dino

**What changed (owner request):** the Dinosaurs card in the theme picker now shows Sail Dino (`dino-03`) instead of `dino-02`.

**Verified:** typecheck and lint are clean; all tests pass. Simulator screenshot of the theme picker.

## 2026-11-03: New palette: colour strip, shiny and glitter buckets, more pens

**What changed (owner request, with a reference picture: "create color palette like this and add more options like glossy, pens, bucket options and lots of colors"):**
- **Colour strip:** the swatch grid is replaced by one tall rainbow strip of 69 colours (was 48; every old name kept, 21 added), with an ink pointer beside the chosen colour. With the rainbow bucket on, the strip shows the 12 rainbow blends.
- **Tool column** of picture tiles, each with a sample of what it paints:
  - Buckets: plain, **shiny** (new `texture` fill, `glossy`), **glitter** (`texture`, `glitter`), pattern (a second tap steps to the next pattern), rainbow. The Colours, Patterns and Rainbows tabs are gone.
  - Pens: marker (the old brush), **crayon**, **glitter pen** and **spray**. A stroke saves its `pen` (left out for a marker).
  - The eraser is unchanged, at the bottom.
- New shader `src/render/textureShader.ts` (glossy, glitter, crayon); spray uses a blur. New icons: marker, crayon, glitter pen and spray can.
- Saved data stays compatible: `texture` is a new, additive fill type, and `pen` is optional. Unknown texture or pen ids from a newer version draw as plain colour or a marker.

**Verified:**
- Typecheck and lint are clean; 604/604 tests pass. New tests compile and render the texture shader (glossy is mostly the colour with a white shine, glitter has white sparkles, crayon lets paper through), check the bucket fills and pattern stepping, and round-trip textured fills and pen strokes through SQLite.
- On the iPad simulator, the new rail shows the strip, pointer, tiles and samples, and a shiny-bucket fill on Spotty Hugger shows the top-lit shade and shine.
- Manual check still needed on an iPad: glitter bucket, pattern stepping, each pen (crayon grain, glitter sparkles, soft spray), pen sizes, eraser over each pen, and the rainbow strip.

## 2026-11-03: Clearer "start over" icon

**What changed (owner report: the arrow was not visible):** the old arrowhead was a thin corner sitting on the end of the circle, so the two ran together into a blob. The icon is now a circle going round clockwise with a gap at the top right and a solid triangle arrowhead (`reset` in `src/ui/icons.ts`). The same icon is used in the start-over sheet.

**Verified:** checked in a simulator screenshot of the top bar; typecheck and lint are clean; 604/604 tests pass.
- **Follow-up (owner: "the arrow doesn't match the other arrows"):** the solid arrowhead is now an open chevron the same size and angle as undo and redo, drawn with the same rounded line. The button is now teal (new `teal` tone, white icon) instead of yellow, because a white arrow on yellow would be too faint. Checked in a simulator screenshot; typecheck and lint are clean; 604/604 tests pass.
- **Second follow-up (owner: "still not looking great"):** the circle was small and the arrowhead's inner arm crowded it. Now redo's arrowhead and straight shaft sit at the top, and the loop is a bigger circle (radius 15) carried three-quarters of the way round, so nothing overlaps. I compared five versions beside redo at real size before choosing. Checked in a simulator screenshot; typecheck and lint are clean; all tests pass.

## 2026-11-03: Camera button uses the owner's camera picture

**What changed (owner request):** the white line camera on the pink top-bar button is replaced by the owner's full-colour yellow toy-camera picture (`assets/images/camera.png`, 256 × 256 PNG with a transparent background), shown at 66 % of the button. The button still shows the white flash, haptic and photo preview.

**Licence:** the picture's source and licence were not given. It looks like stock icon art, which often requires attribution or a paid licence. **To be confirmed by the owner before release.**

**Verified:** checked in a simulator screenshot of the top bar; typecheck and lint are clean; all tests pass.

## 2026-11-03: Palette redesign: tools as toys

**What changed (owner: "the whole color palette is not looking good at all"):** the tool tiles looked like a settings list. Every tile was a beige box with a small icon and a sample dot, and the five buckets looked the same. The rail now follows the owner's reference picture more closely:
- Each tool is a big toy lying on its side and pointing left at the colour strip, with no box: paint pail, shiny paint tube, glitter shaker, pattern roller, rainbow roller, marker, crayon, glitter pen, spray can and eraser (new `src/ui/toolPaths.ts` path data, drawn by `src/ui/ToolArt.tsx`).
- Unpicked tools keep their own bright colour. The picked tool slides out towards the strip onto a soft pill and shows the chosen colour. The tube, shaker and rollers are painted with the real fill (gloss, glitter, the current pattern, the chosen rainbow).
- The colour strip has an ink outline like a crayon box. The chosen colour gets a thick white frame and the pointer.
- `FillShader` takes an optional pattern `cell`, so a roller shows several pattern shapes.
- Removed the four pen icons from the previous version. The older `bucketColor`, `brushColor`, `eraserColor` and `paletteColor` icons and `src/render/FillDot.tsx` are now unused; they are kept until the owner agrees to delete them.

**Verified:** checked in simulator screenshots, with the pattern roller and the rainbow roller picked. Typecheck and lint are clean; 615/615 tests pass, including a new test that every tool picture parses and stays on its grid. Still to check on an iPad: tapping each tool and the size dots.

## 2026-11-03: Stars in the colour or pattern the child used

**What changed (owner request):** celebration stars were always six fixed bright colours. Now each star is painted with the fill the child just used, drawn by the same shader as the page: a plain colour, the pattern (repeat 11 star units, so a few shapes show), the rainbow, gloss or glitter. Pen strokes pop stars in the pen's colour (glittery for the glitter pen). The finishing shower uses the fill that finished the picture. Very pale solid stars get an ink edge instead of white. `StarFlight.color` became `fill`; without a fill, the stars fall back to the old bright colours.

**Verified:** typecheck and lint are clean; 617/617 tests pass, with new tests that every star carries the given fill and that the fallback is still multi-coloured. I drew sample stars offline with the real star path and shaders (solid, hearts pattern, rainbow, glossy, glitter, white with ink edge), and each looked right. Not yet seen in the running app: the stars show for about 1 s after a tap, and I can't tap the simulator reliably from here.

## 2026-11-03: Palette, third version: tabs, square strip, round tool rail

**What changed (owner: "still looking bad… keep simple large paint bucket, brushes so kids can understand"; then a reference picture, "but for color selection don't keep the circle"):**
- **Four tools** in a light-blue rail of big round buttons: paint bucket, brush, crayon, eraser. They are redrawn in a sticker style (flat colours, ink outline), and the picked tool's paint shows the chosen paint. The pens tool list (marker, glitter pen, spray) and the bucket variants are gone as tools.
- **Kinds of paint are tabs** above the strip: plain, shiny, glitter, patterns, rainbows. A tool shows only the tabs it can use. Patterns are now picked directly from the strip, with no more "tap again".
- **Strip:** square bands with ink lines and small corners. The chosen band juts out with a white frame; no circle.
- **Pen sizes** sit in the rail, so they can no longer run outside the panel.
- `Tool` is now `{ tool, paint, finish, color, pattern, rainbow, size }`, with `finishFor` and `strokePen` in `swatches.ts`. Saved artwork is unchanged; spray strokes still draw, but no tool makes them any more.

**Verified:** checked in simulator screenshots with the bucket picked (five tabs) and the brush picked (two tabs and size buttons). Typecheck and lint are clean; all tests pass. `src/ui/ToolArt.tsx`, `src/ui/toolPaths.ts` (+ test) and the `paletteColor` icon are now unused, and are kept until the owner agrees to delete them.

## 2026-11-03: Owner's bucket and brush pictures in the tool rail

**What changed (owner request):** the paint bucket and brush buttons now show the owner's sticker pictures (`assets/images/tool-bucket.png`, `tool-brush.png`, 500 × 500 PNG with transparent backgrounds), at 80 pt in the 84 pt circles. Crayon and eraser keep the drawn icons. The pictures are fixed images, so the bucket's drop and the brush's paint no longer change to the chosen colour.

**Licence:** the pictures look like Icons8's sticker style. Icons8 needs a link back to them or a paid plan for use in an app. **To be confirmed by the owner before release.**

**Verified:** checked in a simulator screenshot of the rail; typecheck and lint are clean; all tests pass.
- **Follow-up:** the third tool now shows the owner's pencil sticker (`assets/images/tool-pencil.png`, same style and licence note). Its accessibility label is now "Pencil"; it still draws with the waxy crayon look. Checked in a simulator screenshot; all tests pass.
- **Follow-up:** the eraser now shows the owner's eraser sticker (`assets/images/tool-eraser.png`, same style and licence note), so all four tools match. The drawn tool icons stay only as a fallback. Checked in a simulator screenshot; all tests pass.

## 2026-11-03: Palette: shiny removed, paint buttons in the rail, strip beside the tools

**What changed (owner request):**
- Removed the shiny (`glossy`) choice. The bucket now offers plain, glitter, patterns and rainbows. Shiny fills already saved still draw (the `texture`/`glossy` fill and its shader stay).
- The paint-kind buttons moved from a row above the strip into the tool rail, under the tools (56 pt round, after a divider). Pen sizes follow them at the bottom. The rail now scrolls in case a short screen can't fit it all.
- The strip now sits right next to the rail (6 pt gap), so the panel is slimmer and the picture area wider.

**Verified:** checked in a simulator screenshot (bucket with the rainbow paint picked); typecheck and lint are clean; all tests pass.
- **Follow-up (owner: "why the border looks so bad"):** the 80 pt tool pictures were bigger than the space inside the 84 pt circles (minus the border), so the stickers' edges and the paint drop spilled over the ring and it looked broken. The pictures are now 64 pt and sit fully inside. The picked ring is drawn outside the circle (ink border plus a 3 pt outline) instead of a thicker border and a scale-up. Checked in a zoomed simulator screenshot; all tests pass.

## 2026-11-03: Brush and pencil are clearly different

**What changed (owner: "what's the difference between pencil and brush?", then "let's do it"):** they differed only by texture. Now:
- **Brush:** the big painting tool. Thick, smooth strokes in three sizes, now 18 / 32 / 54 page units (were 12 / 26 / 48), or a glitter pen with the glitter paint.
- **Pencil:** always a fine 7-unit line with a new light pencil grain (texture shader kind 3, pen id `pencil`), plain colours only. It has no size buttons.
- The tool id `crayon` became `pencil`. Strokes saved with the old `crayon` pen still draw with the waxy crayon look.

**Verified:** typecheck and lint are clean; 619/619 tests pass, with a new shader test for the pencil grain. I drew sample strokes offline with the real shader (brush small and big, pencil, old crayon), and they look clearly different. Still to check on an iPad: drawing with each tool, and that the size buttons show only for the brush.

## 2026-11-03: Colour board with shiny paint balls

**What changed (owner: "implement exactly like this… same background colour and border… a colour board"):** the square colour strip became a board copied from the owner's reference. The board is tan (`#F6CF92`) with a golden-brown border (`#D9A04A`) and a darker right and bottom edge (`#B08A58`); all three colours were sampled from the reference image. It holds one column of shiny paint balls (58 pt, darker rim, white shine). Glitter, pattern and rainbow balls are drawn with the real fill. The chosen ball grows and gets a white rim and an ink ring.

**Verified:** checked in a simulator screenshot (patterns paint picked). Typecheck and lint are clean; all tests pass.
- **Follow-up (owner: "colours are too close to each other"):** the gap between balls went from 4 to 16 pt, with a little more padding at the ends. Checked in a simulator screenshot; all tests pass.
- **Follow-up (owner: the last ball touched the board's bottom edge; "the margin should be the same as the top colour"):** the board's border, background and rounded corners were on the `ScrollView` itself. On iOS the scroll content does not make room for its own border and corners at the end, so the bottom gap was eaten. The board is now a plain `View` frame (border, background, `overflow: hidden`), with the `ScrollView` inside it, so the gap above the first ball and below the last are the same (12 pt). Typecheck and lint are clean; all tests pass. Not checked on screen: I can't scroll the simulator from here. Owner to confirm by scrolling to the last colour.

## 2026-11-03: App icon

**What changed (owner request):** the Expo starter icon is replaced. I drew four concepts (rainbow bucket, coloured monster, paint palette, brush and rainbow); the owner chose **B**, the Spotty Hugger monster (`monster-08`) coloured in on sunny rays.
- New `tools/app-icon/generate.ts` draws it from the page's own region paths with CanvasKit and writes:
  - `assets/icon.png`: 1024 × 1024 RGB with no alpha channel, as the App Store requires (the tool writes plain-RGB PNGs itself);
  - `assets/favicon.png`;
  - the Android adaptive layers: sunny-rays background, the monster on transparent sized for the round-mask safe zone, and a monochrome silhouette.
- Ran `npx expo prebuild --platform ios --no-install`, so the iOS asset catalog now holds the new icon.
- `assets/splash-icon.png` is not referenced in `app.json`, so the splash screen is just the cream background colour (unchanged).
- Provenance row added to `art/PROVENANCE.md`.

**Verified:**
- I checked the icon at full size and at home-screen size.
- I checked the Android layers in a round and a rounded-square mask.
- The icon file is RGB, 1024 × 1024. The iOS asset catalog's icon now shows the monster.
- Typecheck and lint are clean; 619/619 tests pass.

Not seen on a device yet: it needs a native rebuild (`npx expo run:ios`, or the TestFlight archive).
- `MARKETING_VERSION` in the iOS project is still 1.0, while `app.json` says 0.1.0. Set the version in Xcode before archiving (TestFlight steps).
