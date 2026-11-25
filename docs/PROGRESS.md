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

## 2026-11-03: v1 scope decided; parental gate on "Open Settings"

**Decision (owner):** v1 ships Tap to Color only. The other activities follow in updates (D11, docs/ROADMAP.md "v1 scope", with a trimmed release checklist).

**What changed:**
- New parental gate, built to the existing docs/UX.md spec: a random multiplication (3–9 × 4–9, so every answer has two digits) with a number pad, "For grown-ups" wording and grown-up styling. A wrong answer asks a new question; Cancel closes it. The logic is pure (`src/engine/parentalGate.ts`) and the screen is `src/ui/ParentalGate.tsx`, drawn over its parent so it works inside a sheet.
- The camera sheet's "Open Settings" button (shown only when Photos access was refused) now goes through the gate before leaving the app. That was the one outbound link without a gate, which Apple's Kids Category guideline does not allow.

**Verified:** typecheck and lint are clean; 623/623 tests pass, with new tests for the question range, exact-answer check and two-digit limit. **Manual check needed**, since the gate only shows after Photos access is refused:
1. In iPad Settings → Privacy & Security → Photos → Little Color World, choose None.
2. Colour a page, tap the camera, then tap Open Settings: the gate appears.
3. A wrong answer asks a new question, Cancel closes it, and the right answer opens Settings.

## 2026-11-03: Even selection rings; eraser stays inside its part

**What changed (owner report from the real iPad):**
- **Rings looked uneven** on the colour balls and the tools. They were drawn with iOS `outline`, a thicker border and a scale-up, and the ball's border also shrank the ball. Now every round item in the panel (balls, tools, paint buttons, size buttons) sits in a `RingButton` slot 14 pt bigger than the item. The slot's own border is the ring: ink when picked, transparent otherwise, with a white gap for the balls. The ring is part of the layout, so it is always a whole circle, never clipped, and picking never moves or resizes anything. Spacing was reduced to keep the same visible gaps.
- **The eraser spilled into other parts:** a rub that crossed a line erased brush paint and cleared the bucket colour of every part it passed over. Now a rub stays in the part it started in: its stroke is clipped to that part, like brush paint, and only that part's colour is cleared. A tap still clears one part.
- Eraser rubs saved before this change are now clipped too, so paint they had erased in a neighbouring part comes back on those pictures. That is rare and harmless.

**Verified:** typecheck and lint are clean; 623/623 tests pass. A simulator screenshot shows even rings on the chosen ball, tool and paint button. **Manual check needed on the iPad:** fill two touching parts, rub the eraser from one across into the other, and confirm only the first part clears.

**Note:** the simulator had been showing a stale app with blank pictures because the dev server was not running. Start it with `npx expo start --port 8082` in a terminal.
- **Follow-up (owner: "colour selection border doesn't look smooth"):** the ring was two nested iOS rounded borders. Their edges fell between pixels, so the thickness wobbled and a thin dark fringe showed between the white gap and the ball. The picked ring is now drawn with Skia, only for the picked item: an ink circle plus, for the balls, a white circle that overlaps the ball and the ring by half a point, so no fringe can show. It covers the balls, tools, paint buttons and size buttons. Checked at 4× zoom on the simulator (smooth, even ring, clean gap); typecheck and lint are clean; all tests pass.
- **Follow-up (owner: the thickness buttons looked bigger than the paint buttons, and should show the paint):** the size buttons were `size.touchMin + 8` = 72 pt, while the paint buttons are 56 pt. They are now 56 pt too; the touch target with the ring slot is 70 pt, still above the 64 pt minimum. Each dot (14, 24 and 36 pt) is now drawn with the brush's real paint, so glitter shows as glitter, with a thin darker rim like the colour balls so a white dot still shows. Checked in a simulator screenshot (glitter picked); all tests pass.

## 2026-11-03: Coloring screen: tighter gap and bottom margin

**What changed (owner request):** on coloring pages, the gap between the picture card and the colour panel is 12 pt (was 24), and the padding under them is 8 pt (was 24). The safe area is kept, so nothing reaches the home indicator. `Screen` takes a new optional `bottomPadding`; other screens are unchanged.

**Verified:** checked in a simulator screenshot (bigger picture card, panel alongside); typecheck and lint are clean; all tests pass.

## 2026-11-03: Tool rail fits every iPad without scrolling

**What changed (owner report: on an iPad Pro 11" (3rd gen) the tool rail needed scrolling):** the rail needs up to about 760 pt at full size: four tools, plus the brush's two paints and three sizes. An 11" iPad gives it about 616 pt. Now the rail measures its height (`onLayout`) and shrinks every round button by one factor. The factor is worked out for that fullest case, so buttons keep one size whichever tool is picked. The maths is a pure function in `src/features/coloring/railFit.ts`, with a 65 % floor and full size when there is room. On the 13" nothing changes; on the 11" it is about 77 % (tool slots about 79 pt, small slots about 57 pt). The rail is still a `ScrollView`, only as a safety net for very short screens. The colour board still scrolls, since 69 colours fit on no iPad.

**Verified:** typecheck and lint are clean; 629/629 tests pass, with new fit tests for the iPad Pro 11", iPad Air and iPad 9th gen heights. Simulator check on the iPad Pro 11-inch (M4) with the brush picked (the fullest rail): all four tools, both paints and all three sizes show in a rail of about 640 pt, with about 19 pt to spare after the last size button, so there is nothing to scroll. Drags could not be simulated from the command line, so the no-scroll check is by measurement, not by swiping.

**Housekeeping:** the Mac ran out of disk space (installs and commands failed). With the owner's OK I deleted `~/Library/Developer/Xcode/DerivedData`, about 37 GB, which Xcode rebuilds automatically.

## 2026-11-03: Rail rings clear the dividers; "turn me sideways" when the iPad is upright

**What changed (owner reports from the real iPad):**
- **The picked ring touched the divider line** in the tool rail (for example the eraser over the paint buttons). Each divider now has 6 pt above and below it, about the same as the 7 pt between a ring and the next button. The fit maths (`railFit.ts`) counts the new space, so the rail still never scrolls; on the iPad Pro 11-inch (M4) simulator the brush rail (the fullest) still fits, with about 10 pt to spare.
- **The app could be opened upright on the iPad** although it is set to landscape only. The cause is iPadOS 26: Apple deprecated `UIRequiresFullScreen`, and iPadOS 26 can show landscape-only apps upright when the rotation lock is off. No setting prevents it. **Decision (owner):** when the window is upright, a full-screen "turn me sideways" picture covers the app (`src/ui/RotateHint.tsx`, docs/UX.md "Upright iPad"). It goes away when the iPad is turned back, and nothing underneath is lost.

**Verified:** typecheck and lint are clean; 629/629 tests pass. Simulator screenshots: the eraser's and brush's rings clear the dividers, and the brush rail fits. The simulator keeps the app landscape when rotated, so the hint was previewed by forcing it on temporarily (removed again). **Manual check needed on the iPad:** turn rotation lock off, hold the iPad upright, open the app: the turning-iPad picture shows; turn it sideways: the app is back where it was.

**Housekeeping:** a Prettier run reformatted four files to 80 columns (the repo has no Prettier config). `Palette.tsx` was restored from Claude Code's file history plus the three rail changes, confirmed identical in content; the others were reformatted back with width 140 and single quotes, which matches their original formatting exactly.

## 2026-11-03: Themes open quickly the first time (pictures preloaded at launch)

**What changed (owner report: the first open of a theme took a long time):**
- **Cause:** the first open of any theme fully checked the geometry of all 455 bundled pages in JavaScript, not only that theme's pages: about 1.5 s on a Mac and much longer on an iPad. Then every thumbnail turned its page's SVG paths into Skia paths on its own, and the coloring screen did it again.
- **Lighter check:** bundled pages now get only the schema check at runtime (27 ms for all of them, instead of 1,493 ms). The full geometry check still runs on every bundled page in `npm test` and at import, so a page that fails it cannot ship. Downloaded packs (Phase 5) must still get the full check.
- **Shared paths:** each page's Skia paths are built once and shared by its thumbnails and the coloring screen (`skiaPageFor`).
- **Preload:** right after launch, `src/render/preloadPages.ts` builds every page's paths in the background, in 8 ms slices so taps and animations stay smooth: theme covers first, then each theme's pages in catalog order.

**Verified:** typecheck and lint are clean; 632/632 tests pass, with new tests for the preload order, slicing and stopping. On the iPad Pro 11-inch (M4) simulator, opening Sea Animals (98 pictures) right after launch: before, the catalog was still frozen 3 s after the tap; now the pictures are showing within 0.4 s.

## 2026-11-03: App Store listing, screenshots and preview video (ASO)

**What changed (owner request: maximum visibility in a competitive space):**
- **Listing text** in docs/ASO.md, every field counted against Apple's limits: name "Little Color World: Coloring", subtitle "Toddler & Kids Painting Games", a 98-character keyword field with no repeats, promotional text, a parent-focused description, What's New, plus a Spanish (Mexico) name, subtitle and keywords (likely also searched in the U.S.). Category, age rating and privacy answers are listed.
- **10 screenshots** for the iPad 13" display (2752 × 2064, landscape, no transparency) in `store/ios/ipad-13/`: real screens from the iPad Pro 13-inch (M4) simulator, with a headline over each on the Sunny Meadow yellow and an iPad frame. Pictures were coloured by writing artwork rows into the simulator app's database, in the app's own save format, so every screen is the real app.
- **App preview video** in `store/ios/app-preview/`: 1600 × 1200, 24.3 s, H.264 at a steady 30 fps, with a silent stereo AAC track. One take of real use, ending in the star shower.
- **Scripts** in `tools/store/` to remake them (colouring plan and previews, caption compositor, video converter without ffmpeg, tap points). How to use them is in docs/ASO.md.

**Verified:** typecheck and lint are clean; 632/632 tests pass. Screenshot sizes checked (2752 × 2064, RGB). The video was checked for size, frame rate (30 fps), length and audio (2 channels, 48 kHz AAC), and still frames were viewed. Every count in the listing (425 pictures, 10 themes, 54 dinosaurs, 69 colours, 8 patterns, 12 rainbows) was checked against the content and code.

**Open:** the clipart licences must also cover marketing use; check the name is free in App Store Connect; the silent audio track encodes far below 256 kbps, so if App Store Connect rejects it, add soft music.

## 2026-11-03: Support page and privacy policy

**What changed:** App Store Connect needs a Support URL and, for a kids app, a Privacy Policy URL. Both pages are in `site/` (`index.html`, `privacy.html`, `style.css`, the app icon) in the Sunny Meadow style, with no scripts or trackers. The support page has the contact email (shekharskamble@gmail.com), a parent FAQ (saving to Photos, turning Photos access back on, autosave, undo, offline, the turn-sideways picture, supported iPads) and the promises. The privacy policy states the app collects no data, with sections on on-device pictures, add-only Photos access, no internet use, children's privacy (COPPA, GDPR), the grown-up gate, Apple and contact. Publisher: Shekhar Kamble.

**Verified:** each statement was checked against the code: the only permission is add-only Photos (`NSPhotoLibraryAddUsageDescription`), there are no network calls in `src/`, no analytics, ads or crash-reporting packages in `package.json`, and the iOS deployment target is 16.4. Both pages were rendered with Quick Look and looked right.

**Next (owner):** publish from a public repo `littlecolorworld` with GitHub Pages (steps in docs/ASO.md "Support and privacy URLs"), then paste the URLs into App Store Connect.

**Published (same day):** the owner pushed `site/` to the public repo `shekharskamble/littlecolorworld` with GitHub Pages. Checked: both URLs, the icon and the stylesheet return 200, and the live files match `site/` exactly.

## 2026-11-03: Eraser: touch a part and it goes back to white

**What changed (owner test with a 5-year-old):** the child could not tell when the eraser's tap cleared a part and when a drag rubbed out paint. The eraser now has one rule: a tap or a rub clears the whole part the finger lands on (its colour and its brush paint) when the finger lifts, and never touches the next part. It works on the pan gesture's raw touches (`ColoringCanvas.tsx`), so a still tap counts as well as a rub. One clear is one undo step; touching a blank part does nothing. The eraser no longer makes rub strokes. Rub strokes in pictures saved earlier still draw and undo as before (the history engine is unchanged).

**Verified:** typecheck and lint are clean; 632/632 tests pass. On the iPad Pro 13-inch (M4) simulator: a tap on one frill stripe cleared just that stripe; a rub from the body across the frill cleared only the body; two undos brought both back.

**Lesson:** I first restarted the dev server with `CI=1`, which turns off reloading, so two rounds of tests ran old code and pointed at the wrong cause. Noted in docs/ARCHITECTURE.md §13. The dev server is now running in watch mode, started from this session on port 8082.

## 2026-11-03: Preview video: original lullaby and a smooth catalog transition

**What changed (owner request):**
- **Music:** an original, calm music-box lullaby composed in code (`tools/store/music.py`: waltz in C major, 90 bpm, music-box melody, soft chord pad, light reverb, fade in and out; peaks at −6 dB, no clipping). Nothing to licence. The video's audio is now real stereo AAC at about 252 kbps (the silent track encoded at almost nothing, which App Store Connect might have rejected).
- **The lag after Let's Color:** investigated. JavaScript is not blocked during it (a heartbeat logger ran every 100 ms), covers draw offscreen in 5–15 ms each, and a cold GPU shader cache adds only about 0.1 s. The recording shows the fade from Home to the catalog stuck half-way until the next touch, even with no thumbnails at all; the same fade completes in under a second when the simulator is screenshotted instead. So it is a simulator recording artifact, not app work. In a fresh take, the 2 stuck seconds show the real finished catalog screen (same state), faded in over 0.3 s. `tools/store/preview.swift` gained music and still-frame options.

**Verified:** the final file is 1600 × 1200, 24.1 s, 30 fps, stereo AAC 48 kHz; still frames checked across the whole video. Typecheck clean. All temporary timing code was removed (checked with grep).

**Correction:** my first lag measurements wrongly said there was no freeze: two unreadable frame timestamps broke the sorting in my gap script. The frame-by-frame check above is what counts.

**Next (owner):** check that Let's Color → catalog looks smooth on the real iPad.

## 2026-11-13: New Flowers theme (40 pages)

**What changed (owner request: "lets add new category flowers", with the 40 SVGs attached):**
- New theme `flowers` ("Flowers", 🌷, rose `#E2609A`, order 11, last in the picker, cover `flower-20` Sunflower) in `content/themes.json`.
- 40 pages `flower-01` … `flower-40` from the owner's "Bold Flowers" pack (`~/Desktop/Little Color World/BoldflowersSVG/Flowers-01…40.svg`), converted by the new `tools/flowers/generate.ts` like the Monsters pages: no background, big and centred, every closed shape a part. Sources are in `art/svg/flowers/source/`.
- No licence file came with the pack: provenance rows say **licence for use in a paid app: to be confirmed by the owner**.

**Verified:**
- All 40 pages import with 0 errors and 0 warnings; `lcw page validate` passes 495/495 pages. Typecheck and lint are clean, and 672/672 tests pass.
- I checked previews of the trickier pages: Sunflower's seeds, the solid-black centres (Black-Eyed Susan, Gerbera) opened into colourable parts, and the small flowers on Forget-Me-Not, Snapdragon and Flower Spike are separate parts. None has a background shape. Two tiny centres (on Forget-Me-Not and Flower Spike) stay solid black, which is fine at that size.
- Manual check needed on an iPad: open Flowers from the theme picker and colour a page or two. The drawings are tall, so they fill the page height but not its width.

## 2026-11-13: New Buildings theme (35 pages)

**What changed (owner request: "now lets add building category", with 35 SVGs attached):**
- New theme `buildings` ("Buildings", 🏠, brick `#C9733F`, order 12, last in the picker, cover `building-castle`) in `content/themes.json`.
- 35 pages `building-<name>` (house, castle, barn, fire station, police station, hospital, school, library, lighthouse, log cabin, skyscraper, apartments, office, hotel, shop, shopping mall, post office, museum, theatre, stadium, train station, airport, gas station, car park, city hall, courthouse, clock tower, observatory, greenhouse, stable, water tower, watchtower, factory, warehouse, power plant) from the owner's potrace-traced clipart in `~/Desktop/Little Color World/Building SVG/`. They are converted by the new `tools/buildings/generate.ts` like the Flowers pages: no background, big and centred, every closed shape a part. Sources are in `art/svg/buildings/source/`.
- No licence file came with the files: provenance rows say **licence for use in a paid app: to be confirmed by the owner**.

**Verified:**
- All 35 pages import with 0 errors and 0 warnings; `lcw page validate` passes 530/530 pages. Typecheck and lint are clean, and 707/707 tests pass.
- I checked the previews of Castle, House, Log Cabin, Theatre, Stadium, Airport, Clock Tower, Factory and Power Plant: windows, doors, roofs, logs and marquee bulbs are separate parts, with no background shape. The power plant's steam is an open line in the drawing, so it is not colourable.
- Manual check needed on an iPad: open Buildings from the theme picker and colour a page or two.

## 2026-11-13: New pictures over the CDN, with NEW badges (Phase 5 client + publishing CLI)

**What changed (owner request: send new SVGs via a CDN without an app update; they appear first in the theme picker with a NEW badge; owner chose automatic checks, option B):**
- **Decision D7 revised:** one check per app launch while the app is open, never in the background (CLAUDE.md hard rule, PRODUCT, UX, ARCHITECTURE, ROADMAP updated). docs/CONTENT_DELIVERY.md rewritten to match what is built.
- **Client** (`src/features/content-updates/`): signed manifest (Ed25519), SHA-256 and exact size for every file, host allowlist, size caps, 15 s timeouts, zod + full `validatePage` on every page, id-collision rules, `minAppVersion`. Packs install atomically (staging folder renamed into place, then one SQLite transaction) and join the registry while the app is open. At launch, installed packs load before the catalog shows; unreadable packs, or packs that clash with bundled content, are dropped.
- **Registry** merges bundled and downloaded content and notifies screens when a pack arrives; themes listed in the new `content/remote.json` are left out of the bundle.
- **NEW badges** (migration 2: `installed_content`, `new_page`): new themes go first in the picker with a NEW sticker; new pictures go first in their theme with their own badge until opened, and stay at the front for 14 days.
- **Publishing CLI:** `npm run lcw -- pack keygen | build | manifest | serve`. `lcw index` skips CDN-only pages.
- New dependencies: `@noble/curves` 1.9.7 (Ed25519 verify) and `@noble/hashes` 1.8.0 (SHA-256), pure JS (no native module), pinned to the 1.x lines that ship CommonJS for Jest and Metro. Metro logs a harmless "not listed in exports" warning for `@noble/hashes/crypto.js`.

**Not done yet (stubs, stated openly):**
- **Hosting (ROADMAP D4) needs owner approval**; there is no upload command yet.
- **Production signing key:** `PUBLIC_KEY_HEX` is empty, so release builds never go online. The owner runs `npm run lcw -- pack keygen` (writing to the Keychain was refused to me, rightly) and pastes the printed key into `src/features/content-updates/config.ts`.
- Development builds use a throwaway dev key (`DEV_PUBLIC_KEY_HEX`) that can only sign content for `localhost`.
- The New Pictures screen is still the "Coming soon" placeholder (it is not linked from home).

**Verified:**
- Typecheck and lint are clean; 735/735 tests pass. New tests: an end-to-end updater test against a fake signed CDN with real page files (new theme, extra pages for an existing theme, bad signature, a page changed after publishing, id clashes, a page failing the geometry check, `minAppVersion`, already installed, upgrade), launch-time loading and retiring of clashing packs, URL allowlist, UTF-8 decoding, the repository's badge rules, and `newFirst`.
- On the iPad simulator: with Buildings marked CDN-only, the app downloaded, verified and installed the 35-page pack from `lcw pack serve` at launch, and Buildings appeared first in the theme picker with the NEW badge. After Buildings went back into the bundle, the next launch retired the downloaded copy and refused to reinstall it ("Theme buildings already exists").
- Buildings is bundled again in this change (`content/remote.json` is empty), because there is no live host yet.
- Manual check still needed on an iPad: open a NEW theme (its badge clears), open a new picture (its badge clears, it stays at the front).

## 2026-11-13: Content hosting on Firebase Hosting

**What changed (owner: "use firebase for hosting … set up everything"):**
- New Firebase project **`littlecolorworld-content`** ("Little Color World", hosting only, no Analytics) under the owner's account; site `https://littlecolorworld-content.web.app`. The app has no Firebase SDK: it only downloads plain files. CLAUDE.md's "no Firebase" rule now says "no Firebase SDKs", with Hosting allowed; ROADMAP D4 decided.
- `firebase.json` (public folder `content/cdn`, leaves out `release.json` and the README; manifest cached 5 minutes, packs one year and immutable) and `.firebaserc`. `.firebase/` is gitignored.
- Published packs now live in **`content/cdn/` (committed)** instead of `dist/`: a Firebase deploy replaces the whole site with that folder, so it must survive a fresh checkout.
- New `npm run lcw -- pack deploy [--dry-run]`: checks the manifest signature against the app's production key and every file's size and SHA-256, then runs `firebase deploy --only hosting`.
- `CONTENT_HOST` in `src/features/content-updates/config.ts` is now `littlecolorworld-content.web.app`.

**Verified:**
- First (empty) deploy released; the live site answers 404 for `/v1/manifest.json`, which the app treats as "nothing new".
- On a throwaway preview channel (deleted afterwards), a dev-signed Buildings pack served with a valid signature, all 35 pages and pack.json matching their SHA-256 byte for byte, the expected cache headers, and `release.json` / README not published.
- `pack deploy` refuses with no manifest, an empty production key, or a manifest not signed with the production key.
- Typecheck and lint are clean; 735/735 tests pass.

**Next (owner):** run `npm run lcw -- pack keygen`, paste the printed key into `PUBLIC_KEY_HEX`; then publish with `pack build` → `pack manifest` → `pack deploy`, and commit `content/cdn/`. Decide before release whether to put a custom domain in front (switching later needs an app update).

## 2026-11-13: New Vegetables theme, delivered over the CDN (30 pages); remote download tested end to end

**What changed (owner request: "add new theme as vegetables and test the remote download"):**
- New theme `vegetables` ("Vegetables", 🥕, `#D9722B`, order 13, cover `veg-07` Carrot), **CDN-only**: listed in `content/remote.json`, so it is not in the app bundle (still 530 bundled pages).
- 30 pages `veg-01` … `veg-30` from the owner's "N007 Vegetable" pack, converted by the new `tools/vegetables/generate.ts`. This pack paints white shapes on top of dark ones, and some drawings (Spinach, Onion, Cabbage) are a dark silhouette with the white inside painted over it. Each source is flattened to the ink a viewer sees (dark added, white cut out, in drawing order), then converted as is: every white area a part, lines exactly as drawn. The fuller converter thinned this pack's thin inner lines away and read its thick outlines as solid shapes, so it is not used here.
- Built pack `content/cdn/v1/packs/vegetables/1` (30 pages, 1.0 MB). It is not live: publishing needs the production key (`pack manifest` + `pack deploy`).
- No licence file came with the pack: provenance rows say "to be confirmed by the owner".

**Verified:**
- All 30 pages import with 0 errors and 0 warnings; `lcw page validate` passes 560/560 pages. I checked previews (Onion, Spinach, Cabbage, Corn, Potato, Chili, Green Peas).
- **Remote download from Firebase, on the iPad simulator:** the pack, signed with the dev key, was deployed to a temporary Firebase preview channel, and the development build was pointed at it for the test. On launch the app downloaded and verified the manifest and all 30 pages, installed them and preloaded them ("Content check: 1 installed", no failures). Vegetables appeared first in the theme picker with the NEW badge. Inside, every picture had a NEW badge. A downloaded page (Carrot) opened in the colouring screen. Back in the picker, the theme's badge had cleared and Vegetables was back in its usual place.
- Afterwards: the dev config was put back to localhost, the preview channel was deleted, and the dev-signed manifest was removed (the live site still answers 404 for the manifest).
- Typecheck and lint are clean; 735/735 tests pass.

**Next (owner):** `npm run lcw -- pack keygen` and paste the key into `PUBLIC_KEY_HEX`, then `npm run lcw -- pack manifest` and `npm run lcw -- pack deploy` to make Vegetables live for everyone; commit `content/cdn/`.

## 2026-11-14: Trace and Color, first slice (letter A end to end)

**Why:** App Review rejected the first submission under 4.3(a)/(b) and 4.2.6 (spam: a tap-to-fill app like many others, mostly stock clipart). The owner chose to add Trace and Color to v1, with original, code-generated content. Owner decisions: two Home buttons; uppercase, lowercase, numbers and shapes; spoken letter names later; dotted guide line.

**What changed:**
- `src/engine/tracing/` (pure TS): `track.ts` measures a stroke and projects a finger onto a limited stretch of it; `trace.ts` advances progress only forward, only along the current stroke, only within reach of the traced part, only when the finger itself moves forward, and only from the start dot. Fast swipes are split into short steps.
- `src/content/schema/trace.ts` + `validateTrace.ts`: a trace item (set, order, strokes as one-subpath paths, `colorPageId`); checks length, page bounds, and that every stroke lies on a colourable part of its page.
- `tools/tracing/generate.ts`: hand-authored "ball and stick" strokes, thickened with canvaskit (`makeStroked` + union) into the colouring page, one part per stroke, in the new hidden theme `tracing`. Writes `content/trace.json`. Only **A** so far.
- `src/content/traces.ts` (bundled items, sets), `src/persistence/tracingRepository.ts` (finished tracings as `artwork` rows of kind `tracing`; no migration needed).
- Screens: `/trace` (sets), `/trace/set/[set]` (items, check sticker via the new `CatalogCard` `done` prop), `/trace/[itemId]` (`TraceScreen` + `TraceCanvas`). Home has a second button, "Let's Trace". The colouring screen's back button returns to the tracing set for tracing pages.
- Stub, shown openly: the abc, 123 and Shapes sets say "Coming soon" until their items are generated.

**Verified:**
- 23 new tests (engine, validation, bundled items against their pages, repository). Typecheck and lint clean; 758/758 tests pass.
- On the iPad simulator: Home shows both buttons; the sets screen, the ABC grid and the A screen render. A screen started half-traced showed ink on the finished and partly traced strokes and dots on the rest. The arrow was first misread as a "play" sign and is now a shaft with a head.
- Not yet verified: tracing with a real finger (the simulator cannot be dragged from here), and the "Color it!" step.

**Follow-up (owner: "when we color, show that state on the letter picker"):** the set grid's thumbnails and each set's cover on `/trace` now show the child's saved coloring of the item, like the theme pickers. Checked on the simulator with the owner's own orange "A": both screens show it, with the check sticker on the grid. Typecheck and lint clean; 758/758 tests pass.

**Next:** owner tries tracing A for feel (tolerance 56 units, about half the letter's thickness); then generate A–Z, a–z, 0–9 and shapes, polish the pickers, update docs/ASO.md and the screenshots.

## 2026-11-23: Trace and Color complete (72 items), listing and screenshots updated

**What changed (owner: "roll out this feature now and everything we designed"):**
- `tools/tracing/generate.ts` now makes all **72 items**: A–Z, a–z (on a dashed middle line at y 300, bowls of radius 135), 0–9, and 10 shapes (circle, square, triangle, rectangle, oval, diamond, heart, star, pentagon, hexagon). Strokes follow school order and direction; each glyph is centred automatically. Lowercase is thinner (88 instead of 104) so e, s and a keep holes you can see and colour. A stroke that closes on itself also gets its inside as a part (O, o, 0, the shapes).
- Items carry `guides` (worksheet lines): top line and baseline, plus the dashed middle line for lowercase. They are drawn behind the letter through the new `underlay` prop of `PageArtwork`.
- Set grid shows whole pages (`fit="contain"`, 4:3 cards), so lowercase reads small on its lines; the 123 cover is now "2".
- `validateTrace` no longer counts the page-sized background as part of the drawing (it let any stroke pass).
- App Store: docs/ASO.md has a new subtitle ("Toddler ABC Tracing & Painting"), keywords, promotional text, a Trace and Color paragraph, counts updated to 500 pictures in 12 themes, and draft "Notes for App Review". Screenshots: new 02-trace and 07-trace-color, 03-themes re-shot (it said 425), 10-for-parents re-shot (Home now has two buttons); 07-celebrate and 09-dinosaurs moved to `store/ios/retired/`. `tools/store/compose.py` skips shots without a raw capture.
- art/PROVENANCE.md: 72 rows, all generated in code.

**Verified:**
- All 72 pages import with 0 errors and 0 warnings; contact sheets of every glyph checked by eye (first pass found e, s, 6 and g wrong; fixed and re-checked).
- New test: every item is traced to the end by a simulated finger wobbling 20 units either side of the path, lifting between strokes. Plus each item validated against its page. Typecheck and lint clean; 972/972 tests pass.
- On the iPad simulator: sets screen, abc and Shapes grids, and the g, E and Star tracing screens (lines behind the letter, arrow direction right).
- Screenshots: the 12 coloured letters for 07 were rows added to the simulator database for the capture and removed afterwards; the B in 02 was a screen started half-traced for the capture, then reverted.
- Not verified here: tracing with a real finger on an iPad.

**Next (owner):** try tracing on a real iPad (ideally with a child); fill in the Owner lines of "Notes for App Review"; archive and resubmit. The app preview video still shows colouring only (accurate, but it could show tracing too).

## 2026-11-23: Tracing letters colour as one shape

**What changed (owner: "instead of showing overlapping shapes can we have one uniform shape; B and b look ugly"):** the generator now merges all of an item's thickened strokes into one outline (canvaskit union) instead of one overlapping part per stroke. The letter is one region (`letter`, filled even-odd); each hole at least the ages 2–3 minimum part size (0.4% of the page) is its own part (`inside-N`: the two in B, the insides of b, e, 8, O and the shapes); holes from 400 units² up to that stay open (A's small triangle, the curl of g); smaller slivers where strokes meet are filled in. Holes are found by nesting, because Skia's merged outline does not wind them the opposite way. Tracing strokes are unchanged.

**Verified:** all 72 pages re-imported with 0 errors (the only warnings were the expected "region ids removed": colourings saved before this keep their old part names and show blank, as the owner's test A did on the simulator); `lcw page validate` 632/632; contact sheet of all 72 checked by eye. Screenshots 02 and 07 re-shot the same way as before. Typecheck and lint clean; 972/972 tests pass.

**Follow-up (owner: "small g looks weird"):** the g's tail curled tightly back into the bowl, closing a blob with a sliver in it. It is now a long, flat curve (down to y 640, then an elliptical arc 125 × 72 turning 145°) that ends below the bowl with a clear gap. Re-imported with 0 errors and 0 warnings; checked in the preview; tests pass.

## 2026-11-23: Tracing progress is saved and shown in the picker

**What changed (owner: "save trace state on the letter picker"):**
- `tracingRepository`: one `artwork` row per item (kind `tracing`, id `trace:<item>`) now holds where the child got to, `{v:2, stroke, progress}`, saved 0.6 s after the finger stops and on leaving the screen or the app (the coloring screen's autosaver), and at once when an item is finished. `status` becomes `completed` the first time and stays so when the child traces the item again. Rows from before (`{v:1}`, finished only) still read as finished.
- `restoreTrace` (engine) clamps a saved state to the item as it is now. The tracing screen restores it on opening, touches wait until it has, and a finished item reopens finished with "Color it!" showing. "Trace again" saves the fresh start.
- Thumbnails in the set grid and the set covers draw the crayon ink of the child's tracing over their coloring: new `TraceInk` (shared with the tracing screen, which adds the dots) through a new `overlay` prop on `PageArtwork`/`PageThumbnail`.

**Verified:** 5 new tests (restore clamping, repository: progress round trip, completed stays, old rows, separate from coloring). Typecheck and lint clean; 977/977 tests pass. On the simulator: the owner's finished A, G and I show full ink in the ABC grid with checks; a half-traced C (a row added for the test and removed afterwards) showed half ink in the grid and reopened at the same point with the lead dot there.

**Follow-up (owner: "abc looks thicker on the trace picker"):** stroke thickness is 104 for ABC, 123 and shapes and 88 for abc (so a, e and s keep their holes). The sets screen fitted each cover to its own drawing, which blew the short lowercase "a" up about 1.6×, so it looked thicker. Covers now share one frame (`frame` prop on `PageThumbnail`, the band x 112–912, y 70–760), so all four have the same scale. Checked on the simulator; lint clean, 977/977 tests pass.

**Follow-up (owner: "ABC, 123 and shapes don't look centred in the box"):** the shared frame kept each drawing where it sits on the page, and the frame leaves room for lowercase tails, so capitals, numbers and shapes rode high. `frame` on `PageThumbnail` now only sets the scale; each drawing is centred in its card. The frame moved to `TRACE_FRAME` (src/content/traces.ts) and the set grids use it too (they showed the whole page before). Checked on the simulator: sets screen and the ABC, abc and Shapes grids all centred, capitals still bigger than lowercase. Lint clean, 977/977 tests pass.

## 2026-11-23: Vehicles and Buildings cleared by their seller

**What changed:** the owner got written permission from the Vehicles and Buildings seller to use the packs in the app and in App Store screenshots (the pack licence alone only allowed physical products). All 65 rows in `art/PROVENANCE.md` now say covered, with a note to keep a copy of the seller's message with the pack. Licence status now: covered Animals, Monsters, Vehicles, Buildings (145 pages); likely Food (45); unclear Unicorns, Vegetables; not covered Dinosaurs, Sea Animals, Insects, Space, Flowers, Christmas (315 pages), awaiting replies.

**Verified:** text change only; every Vehicles and Buildings row checked to carry the new wording.

**Next (owner):** keep the seller's reply (screenshot or PDF of the Etsy message) next to the pack's licence file; wait for the other sellers before deciding what ships.

## 2026-11-23: Dinosaurs cleared by their seller

**What changed:** the owner got written permission from the Dinosaurs seller to use the pack in the app (the pack licence alone only allowed physical products). All 54 dino rows in `art/PROVENANCE.md` now say covered. The seller also confirmed App Store screenshots and the preview video (screenshots 01 and 03 and the video show dinosaurs), so those stay as they are. Licence status now: covered Animals, Monsters, Vehicles, Buildings, Dinosaurs (199 pages); Christmas has a paid licence offer ($89) under discussion.

**Verified:** text change only; every dino row checked to carry the new wording.

## 2026-11-23: Black eyes for Hatching Friends and Dino Triplets

**What changed (owner: "make the eyes black like the other dinosaurs"):** both pages have three dinosaurs (five or six eyes), but the converter keeps at most one pair of eyes black and turned the rest into colourable rings. `tools/dinosaurs/generate.ts` now takes `eyeAt` per page (as Animals does), listing every eye, so all of them stay solid black with their white highlight. `dino-33` and `dino-85` re-imported as version 2 with `--allow-removed`: the old ring parts (and the renumbered small parts, 4 ids per page) are gone, so a coloring of these two pages saved before this shows those few small parts blank.

**Verified:** previews of both pages checked by eye (every eye black with a highlight, eggs and bodies still colourable); typecheck and lint clean; 977/977 tests pass; 632/632 pages valid.

**Follow-up (owner: "also fix Three Eyes, first eye"):** `monster-42` had the same problem: the converter keeps at most two eyes black, so the first eye's pupil became a colourable spot. `tools/monsters/generate.ts` now lists all three pupils with `eyeAt`; re-imported as version 2 with `--allow-removed` (one part id, `part-10`, gone, so parts were renumbered and an older saved coloring of this page may show a few parts in the wrong colour or blank). Preview checked by eye: three black pupils with highlights, the coloured rings around them still colourable. Checks green (977/977 tests, 632/632 pages valid).

**Follow-up (owner: fix the eyes on Space pages Star Balloon, Comet, Star Friends, Three-Eyed Alien, Planet Friends, Moon Rainbow, Space Rover):** same cause; on these pages the guess picked the wrong pair or found none (more than two eyes, eyes like spots). `tools/space/generate.ts` now lists every eye with `eyeAt` for `space-08`, `16`, `17`, `38`, `65`, `79` and `86`. The Comet's body is not a closed outline in the source, so its eyes are top-level shapes: `eyeAt` in `tools/art/clipart.ts` now accepts top-level (depth 0) solid shapes as well as nested ones (no other page uses it that way, so none changed). The rover lost a part (its left eye), which raised its small-part budget past the validator's 80 regions; `maxRegions` lowered from 117 to 116. All re-imported with `--allow-removed`, so older saved colorings of these pages may show a few parts blank.

**Verified:** debug previews of all seven checked by eye (every eye solid black with its highlight). Typecheck and lint clean; 977/977 tests (the first run caught the rover's 81 regions); 632/632 pages valid.

**Noticed, not fixed:** on the Comet (`space-16`) the body itself is not colourable (its outline is open in the source, so a tap there fills the background).

**Follow-up (owner: "silly alien as well"):** `space-31` (Silly Alien, three eyes) had its third pupil opened as a colourable spot; all three pupils now listed with `eyeAt`, re-imported as version 2 with `--allow-removed`. Preview checked; typecheck and lint clean, 977/977 tests, 632/632 pages valid.

## 2026-11-23: Halloween theme (14 pages), first in the catalog

**What changed (owner: "create a Halloween theme, move it to the first page, add these SVGs"):**
- 14 pictures from the owner's "Cute Spooky SVG Bundle, Kawaii Halloween" (Etsy, `~/Desktop/Little Color World/Halloween.zip`, Pack 1 files 1, 3–9, 11, 12, 16–18, 20) copied to `art/svg/halloween/source/` and converted by the new `tools/halloween/generate.ts` (same converter as Christmas: no background, big and centred). Pages `halloween-01`..`14`: Happy Pumpkin, Little Bat, Ghost in a Hat, Magic Broom, Bubbling Pot, Sweet Candy, Little Spider, Spider Web, Candle Friend, Friendly Ghost, Little Vampire, Mummy, Spooky House, Little Witch.
- `content/themes.json`: new `halloween` theme (orange `#F28C28`, 🎃, cover Happy Pumpkin) at order 1, so it is the first card on the first catalog page; every other theme moved down one.
- `tools/art/clipart.ts`: an eye's highlight now always stays white. Before, a highlight bigger than the part minimum became a colourable part (Sweet Candy and Friendly Ghost draw big ones). Existing pages are unchanged until they are re-imported.
- Licence: the seller confirmed in writing that the app and App Store screenshots are covered (Etsy message 2026-11-23, screenshot `~/Desktop/Halloween Permission.png`); recorded in `art/PROVENANCE.md`.

**Verified:** all 14 imported with 0 errors and 0 warnings; debug previews of every page checked by eye (eyes black with white highlights, every part colourable). Typecheck and lint clean; 991/991 tests; 646/646 pages valid. Not yet looked at on the simulator.

**Next:** the unpublished Vegetables CDN pack still carries theme order 13, which now equals Buildings; rebuild it (`pack build vegetables`) before it is ever published. App Store text says "500 pictures in 12 themes"; update the counts once it is decided which themes ship.

## 2026-11-23: Smiles are one solid line

**What changed (owner: "remove that smile to color with single line, it looks ugly"):** clipart draws a smile as a thick black stroke, and the converter opened every thick stroke into an outline with a thin colourable sliver inside. `tools/art/clipart.ts` now keeps a stroke solid, as drawn, when it is a face stroke: it would open into a sliver (on average under 16 units wide and more than 7 times longer than wide), it has no holes (so open mouths with teeth still open), it is 0.6 to 3 eye widths across and no more than 0.86 as tall as wide, and it sits beside or below a detected eye. Letters, stripes, bars, grilles, sprinkles, gills, monster curls and spots still open as before; an earlier, looser rule caught all of those and was narrowed after reviewing every hit.

**Pages updated (64):** the 10 Halloween pages with a smile, and 54 others re-imported one by one with `--allow-removed`: animal-06, christmas-27, food-01, food-16, food-18, food-22, insect-firefly, insect-grasshopper-01, insect-ladybug-01, insect-slug, insect-snail-01, insect-spider-01, insect-walking-stick, insect-weevil, insect-worm, monster-29, sea-anglerfish, sea-clownfish-01, sea-crab-01, sea-eel, sea-fish-01, sea-fish-02, sea-fish-03, sea-hammerhead, sea-hermit-crab, sea-lobster, sea-manta-ray, sea-narwhal-02, sea-narwhal-03, sea-octopus-01, sea-octopus-02, sea-otter-02, sea-penguin-01, sea-seagull-03, sea-seal-01, sea-seal-02, sea-seashell-01, sea-shark-01, sea-shark-02, sea-shrimp, sea-starfish-01, sea-starfish-02, sea-starfish-04, sea-turtle-03, sea-whale-01, sea-whale-02, sea-whale-shark, space-11, space-17, space-20, space-21, space-25, space-33, space-38. All other pages were left exactly as they were (a first full re-import also picked up small unrelated changes in 275 pages, so it was rolled back from a backup and only these pages re-imported). A saved coloring of one of these pages loses its smile part.

**Verified:** every stroke the rule keeps solid was reviewed on crop sheets, and previews of all updated pages checked by eye. Typecheck and lint clean; 991/991 tests; 646/646 pages valid.

**Not covered:** smiles on pages where no eye is detected (eyes the converter cannot find, e.g. some dinosaurs, monsters and animals) are unchanged; they can be fixed page by page with `eyeAt`.

**Follow-up (owner: "add it to svgs", 10 more from the same bundle):** Pack 2 files 7, 10, 11, 14, 15, 16, 19, 21, 22, 24 copied as `art/svg/halloween/source/halloween-p2-<nn>.svg` and added as `halloween-15`..`24`: Happy Skull, Moon and Clouds, Black Cat, Scarecrow, Bony Hand, Crossbones, Night Owl, Pumpkin Head, Mummy Walk, Count Vampire. Six needed `eyeAt` so their eyes stay solid black (the skull's sockets, the pumpkin head's triangle eyes and nose, the mummy's and vampire's eyes, the scarecrow's eyes, and the cat's two eyes, which came out different from each other). Same licence (the seller's written permission covers the bundle). Halloween now has 24 pages. Debug previews of all 10 checked by eye.

## 2026-11-23: Vegetables cleared by its seller

**What changed:** the owner got written permission from the Vegetables seller to use the pack in the app; all 30 `veg-` rows in `art/PROVENANCE.md` now say covered. Still to confirm: that the permission covers delivering the pages as downloads from the content server (this theme ships over the CDN only). Owner decision: Vegetables pictures are not used in App Store screenshots or the preview video.

**Verified:** text change only.

**Follow-up (owner: 10 more, "use it in halloween"):** Pack 3 files 3, 5, 6, 7, 8, 10, 11, 12, 14, 15 copied as `halloween-p3-<nn>.svg` and added as `halloween-25`..`34`: Wizard Frog, Skeleton Fox, Pumpkin Puppy, Witchy Owl, Pumpkin Piggy, Witch Frog, Monster Monkey, Mummy Kitty, Pumpkin Bear, Bat-Wing Deer. Pack 3 draws eyes as plain black ovals with no highlight, and noses, mouths and jack-o'-lantern faces as solid shapes, so the converter opened them all into colourable rings. New opt-in `keepSpots` option in `tools/art/clipart.ts` keeps loose solid shapes black, in both the loose-spot step and the thick-black ("ridge") step; black areas joined to lines (ears, tails) still open. Used on pages 25–33 (the deer has highlighted eyes and converts normally). No other theme uses the option, so no other page changed. Halloween now has 34 pages.

**Verified:** debug previews of all 10 checked by eye (eyes, noses and pumpkin faces black; hats, costumes and pumpkins colourable).

**Follow-up (8 more from Pack 4):** files 1, 5, 10, 11, 14, 16, 17, 20 copied as `halloween-p4-<nn>.svg` and added as `halloween-35`..`42`: Howling Wolf, Ghost Kitty, Top Hat Skeleton, Flying Pot, Magic Mirror, Pumpkin Ghost, Skeleton Dance, Flying Witch. Their eyes have highlights and convert normally; only Pumpkin Ghost needed `keepSpots` to keep its jack-o'-lantern face black. Halloween now has 42 pages. Debug previews of all 8 checked by eye.

**Follow-up (3 more from Pack 5):** files 1, 2, 4 copied as `halloween-p5-<nn>.svg` and added as `halloween-43`..`45`: Trick-or-Treat Ghost, Heart-Eyes Pumpkin, Cat in a Pot. The ghost needed `keepSpots` to keep its candy basket's jack-o'-lantern face black. Halloween now has 45 pages. Debug previews checked by eye.

## 2026-11-24: Skeleton Fox removed from Halloween

**What changed (owner: "remove skeleton fox from halloween"):** `halloween-26` deleted (page JSON and generated SVG), dropped from `tools/halloween/generate.ts` with a note that its number is not reused, and its provenance row marked removed. The source drawing stays in `art/svg/halloween/source/halloween-p3-05.svg`. Halloween now has 44 pages. A child's saved coloring of this page, if any, no longer has a page to open.

**Verified:** index regenerated; typecheck and lint clean; tests and page validation below.

## 2026-11-24: Construction theme (20 pages), licence not yet cleared

**What changed (owner: "create new theme Construction, cement truck as cover"):** 20 vehicles from the owner's FunnyStrokeCo "Construction Vehicle" pack (`~/Desktop/Little Color World/02_CONSTRUCTION_VEHICLE/SVG`) copied to `art/svg/construction/source/` with the pack's licence file, and converted by the new `tools/construction/generate.ts` (no background, big and centred, `eyes: false` as the vehicles have no faces). Pages `construction-<name>`: Cement Mixer (cover), Backhoe Loader, Bulldozer, Cherry Picker, Compactor, Crane Truck, Dump Truck, Excavator, Flatbed Truck, Forklift, Motor Grader, Pickup Truck, Road Roller, Scissor Lift, Skid Steer, Little Dump Truck, Tower Crane, Tractor, Wheel Loader, Wrecking Ball. New `construction` theme (yellow `#E8A317`, 🚧) at order 16, after Buildings.

**Licence: NOT cleared.** The FunnyStrokeCo Standard License caps commercial use at 500 end products and allows digital products only when the art is flattened so vectors cannot be extracted. The app may sell more than 500 copies and stores pages as vector outlines, so the theme must not ship until the owner buys the Extended Commercial License and the seller confirms app use (and App Store screenshots) in writing. Recorded in `art/PROVENANCE.md`.

**Verified:** all 20 imported with 0 errors and 0 warnings; debug previews checked by eye.

**Follow-up (2026-11-24):** the owner bought FunnyStrokeCo's Extended Commercial License for the Construction pack, which removes the 500-product cap. Remaining check: the extended licence text (or a written reply from the seller) must allow use inside an app, where pages are stored as vector outlines, and in App Store screenshots. Provenance rows updated.

## 2026-11-25: Christmas cleared (paid licence)

**What changed:** the owner paid RheyaStudio's custom $89 "Commercial App Usage License" for the Kawaii Christmas pack. It covers the app on all platforms and future versions, delivery from our servers, saving finished pictures, App Store screenshots and promotional videos, perpetual and irrevocable. Owner accepted the seller's note that some designs may be AI-made, with liability capped at the fee; all 30 pages were reviewed on 2026-11-24 and none resembles a famous character or brand. All 30 `christmas-` rows in `art/PROVENANCE.md` now say covered.

**Next (owner):** keep the licence PDF and the Etsy receipt with the pack.

## 2026-11-25: Licence bought for Sea Animals, Insects, Space and Flowers (terms to check)

**What changed:** the owner bought the seller's "Unlimited Commercial License for one set" (Etsy listing 1770786009). Etsy pages can't be read from here, so its terms are not yet checked: it must allow use inside an app (not only physical products) and App Store screenshots, and "for one set" may mean one licence per pack (four packs). Provenance rows for the four packs note the purchase; they stay not covered until the terms are confirmed.

**Follow-up:** the licence's terms (pasted by the owner): "applies to one single SVG file/bundle listing; purchase a separate commercial license for multiple bundles", granting use on "unlimited physical end products". So it does not cover the app (physical products only) and covers one of the four packs. The four packs stay not covered; the owner needs written permission or a custom app licence from the seller (Jodelyn Paet).

**Follow-up:** the rest of the licence says it may not be used "for digital products like Instagram highlight icons, app icons, or any digital form". The bought licence explicitly excludes the app.

## 2026-11-25: Insects theme replaced with a new pack (30 pages)

**What changed (owner: "remove all the insects and replace them with these; I have the licence"):**
- The 33 old Insects pages (`insect-<name>`, from the pack whose licence forbids digital use) are deleted: page JSON and generated SVGs. Their source drawings stay in `art/svg/insects/source/`; their generator is kept as `tools/insects/generate-retired.ts` (marked do-not-run) and their provenance rows are marked removed.
- 30 new pages from the owner's insect pack (`~/Desktop/Little Color World/Insects`, potrace SVGs) copied to `art/svg/insects/bugs/` and converted by a new `tools/insects/generate.ts`, ids `bug-<name>` so no old id is reused (a saved coloring of an old page can never open on different art). Butterfly, Ant, Aphid, Bumblebee, Caterpillar, Cicada, Click Beetle, Damselfly, Dragonfly, Earwig, Bug Eggs, Firefly, Honeybee, Fly, Hoverfly, Bug Net, Ladybug, Leafhopper, Mayfly, Mosquito, Moth, Wasp Nest, Praying Mantis, Shield Bug, Cocoon, Silverfish, Stag Beetle, Stick Insect, Wasp, Weevil. Theme cover is now `bug-butterfly`.
- `eyes: false` for the pack (the bugs have no faces; a ladybird spot was taken for an eye and left white). The Mayfly's line width measured twice its real thickness and thinning erased its lines; it gets `target: 29`.

**Verified:** all 30 imported with 0 errors and 0 warnings; debug previews of all 30 checked by eye.

**Open:** record the new pack's seller and licence text (owner says it is licensed); App Store screenshot 06 shows the old Butterfly and must be re-shot (`tools/store/colors.json` still has the old `insect-butterfly-01` entry).

**Follow-up (owner: "fix butterfly, inside the wing the lines don't look good"):** the Butterfly's inner wing curves stopped short of the body (a loose, tapered line end), and its upper and lower wings were one shape. `tools/insects/generate.ts` now takes `close` lines per page; the Butterfly gets four, measured from the drawing: each inner curve continued into the body outline, and each wing notch extended to the body. Each side is now an outer band, an inner panel and a lower wing (plus its spot). Previews checked by eye.

**Follow-up (owner: "it looks terrible, no uniformity between strokes, width is wrong as well"):** the pack draws thick outlines and thin, tapered inner lines, and thinning everything by one amount made the inner lines thinner still (and the added closing lines a third width). New dev-only preprocessing step `tools/art/uniform_lines.py` (driven by `tools/insects/uniform_all.sh`): renders each source onto the page, reduces every line to its centre line (skeleton, short stubs pruned), redraws it with a round pen of width 10.5, keeps only blobs where a line ends (antenna knobs) solid, and traces the result back to smooth outlines in `art/svg/insects/bugs-uniform/`. The Butterfly's four closing lines are drawn in this step, so they match. `tools/insects/generate.ts` reads the uniform files and passes the new `lineWidth` option to `addClipartRegions` (`tools/art/clipart.ts`), so they are not thinned again (the Mayfly measured 28 for lines of 10.5 and was being thinned away). The Caterpillar uses a higher solid threshold so its feet are lines, not blobs. Needs rsvg-convert and Python with numpy, scipy, scikit-image and pillow (a throwaway venv); the app never runs it, and the outputs are committed.

**Verified:** all 30 re-imported with 0 errors and 0 warnings; plain previews of all 30 checked by eye (one line width throughout); typecheck, lint, tests and page validation below.

## 2026-11-25: Sea Animals theme replaced with the Cute Fish pack (41 pages)

**What changed (owner: "I found a replacement for sea animals and got the permission to use it too"):**
- The 98 old Sea Animals pages (`sea-<name>`, from the pack whose licence forbids digital use) are deleted: page JSON, generated SVGs and their source drawings. Their generator is kept as `tools/sea-animals/generate-retired.ts` (marked do-not-run) and their provenance rows are marked removed.
- 41 new pages from the owner's "Cute Fish" pack (`~/Desktop/Little Color World/sea animals/selected`, 41 SVGs) copied to `art/svg/sea-animals/fish/NN.svg` and converted by a new `tools/sea-animals/generate.ts`, ids `ocean-<name>` so no old id is reused. Clownfish, Oarfish, Happy Fish, Crab, Sturgeon, Angelfish, Carp, Lionfish, Seahorse, Flying Fish, Sea Urchin, Sea Anemone, Stripy Fish, Arowana, Perch, Fancy Fish, Sea Plant, Betta Fish, Sea Grass, Butterflyfish, Honeycomb Fish, Tetra, Discus Fish, Sea Sponges, Kelp, Flowery Fish, Grouper, Clam and Pearl, Hammerhead Shark, Goldfish, Squid, Sunfish, Sea Turtle, Starfish, Leafy Sea Dragon, Eel, Guppy, Leafy Plant, Anglerfish, Koi, Sea Snail. No seabed or bubbles. Theme cover is now `ocean-clownfish`.
- `uniform_lines.py` moved to `tools/art/` (shared with any future pack).

**Verified:** all 41 imported with 0 errors and 0 warnings; debug previews of all 41 checked by eye. Typecheck ok, lint ok, 981/981 tests (per-page tests went from 98 to 41 sea pages), 636/636 pages valid.

**Open:** record the Cute Fish seller and permission text (owner says permission is given) and whether it covers App Store screenshots; screenshot 08 (old Orca) must be replaced (`tools/store/colors.json` still has `sea-orca`). The Oarfish and Arowana have many very small scale cells; check them on an iPad.

**Follow-up (owner: "we don't have to change every shape to colour, it looks ugly now; fix it based on the original SVGs"):** the one-width redraw is dropped for this pack (`tools/sea-animals/uniform_all.sh` and `art/svg/sea-animals/fish-uniform/` removed). The generator now converts the original drawings the standard way (like Halloween and Christmas), so shapes are as drawn and scales and fin rays stay lines instead of tiny areas. Two pages lost thin lines to thinning and set `lineWidth`: Betta 10.5 (not thinned), Starfish 13 (keeps its dots and black eyes). Pages re-imported with `--allow-removed` (they have never shipped). Debug previews of all 41 checked by eye.

**Follow-up (owner: Betta, Crab eyes, Clownfish, Hammerhead eyes, and the circles on Lionfish, Seahorse, Sea Sponges, Squid, Sunfish, Tetra "all look bad"):** thinning to the Animals thickness hollowed pupils, opened solid dots into thin rings and turned thin inner lines into hairlines. These 10 pages now use `asDrawn`: shapes merged (nonzero union, as a viewer sees them) and converted with `addClipart`, lines exactly as drawn. `addClipart` gained `smallParts` (default off, so Vegetables is unchanged): areas below the part minimum but above the small-part minimum become colourable `small-` parts, and only eye shines stay white. Compared side by side with the source drawings; all 10 match. The Betta no longer needs `lineWidth`.

**Follow-up (owner: "reduce the stroke thickness for all sea animals and keep it consistent with other svgs"):** new `--cap` mode in `tools/art/uniform_lines.py`, run by `tools/sea-animals/thin_all.sh` into `art/svg/sea-animals/fish-thin/`: lines wider than 10.5 (the other packs' thickness) are trimmed to 10.5 around their centre line; thinner lines keep their drawn shape, pupils stay solid, and small separate shapes (dots, the Sunfish's little rings, brows) are kept exactly as drawn. All 41 pages now take one path: `addClipart` with `smallParts` on the trimmed drawings (the per-page `lineWidth`/`asDrawn` settings are gone). Plain previews of all 41 checked by eye: one line weight across the pack, eyes and dots as drawn.

**Follow-up (owner: "make squid, seahorse, koi, angelfish, arowana eyes back to original"):** trimming had hollowed these eyes (pupil and shine read as thick lines). `uniform_lines.py` gained `--keep x,y,r`: the drawn shape at that point is kept exactly as drawn within the circle. `tools/sea-animals/thin_all.sh` sets it for each of those eyes, and for the Squid's solid mouth. Compared side by side with the sources: all match.


## 2026-11-25: Flowers theme replaced with the Simple Flowers pack (24 pages)

**What changed (owner: "remove flowers and add these, I have got the permission to use them"):**
- The 40 old Flowers pages (`flower-NN`, "Bold Flowers", whose licence forbids digital use) are deleted: page JSON, generated SVGs and source drawings. Their provenance rows are marked removed.
- 24 new pages from the owner's "Simple Flowers" pack (`~/Desktop/Little Color World/Flowers/Selected`, the 25 SVGs the owner pasted, 1 to 25) copied to `art/svg/flowers/simple/NN.svg`, ids `bloom-<name>` so no old id is reused: Sunflower, Coneflower, Wild Rose, Baby's Breath, Hibiscus, Magnolia, Orchid, Black-Eyed Susan, Phlox, Tulip, Carnation, Little Sunflower, Lavender, Buttercups, Big Tulip, Hollyhock, Big Hibiscus, Poppy, Zinnia, Daisy, Rosebud, Rose, Pink Carnation, Lupine. Source 01 (Yarrow) is left out: its tiny florets are far over the region limit and without them nothing is left to colour. Theme cover is now `bloom-sunflower`.
- Converted like the Sea Animals pack: `tools/flowers/thin_all.sh` (`uniform_lines.py --cap`) trims lines over 10.5 into `art/svg/flowers/simple-thin/`, also drawing closing lines where the Hibiscus, Big Hibiscus and Pink Carnation petals were open; `tools/flowers/generate.ts` then runs `addClipart` with `smallParts`. (The standard `addClipartRegions` left outer carnation and hibiscus petals uncoloured.)
- `updater.test.ts` reads `bloom-rose.json` instead of the removed `flower-03.json`.

**Verified:** all 24 imported with 0 errors and 0 warnings; colour-filled previews of all 24 checked by eye (every petal and leaf colourable except the Carnation's hair-thin leaves, which stay as drawn). Typecheck ok, lint ok, 965/965 tests, all pages valid.

**Open:** record the Simple Flowers seller and permission text and whether it covers App Store screenshots.

## 2026-11-25: Flowers 26 to 70 added (66 Flowers pages)

**Changed:** the owner asked for the rest of the Simple Flowers pack ("don't redraw, keep stroke width same as other svgs"). 42 of sources 26 to 70 are now `bloom-<name>` pages, made the same way as the first 24: lines over 10.5 trimmed to 10.5 (`tools/flowers/thin_all.sh`), thinner lines and dots as drawn, every white area colourable.
- Closing lines added in `thin_all.sh` where the artist left outlines open: 42 Pinwheel Flower, 59 Dog Rose, 61 Star Lily (stems open at the bottom, so the joined leaves leaked into the background) and 49 Hibiscus Bloom (two petals open at the stamen).
- Left out: 46 Wildflowers, 64 Sweet Pea, 66 Chamomile. They are sketchy drawings with dozens of broken lines, so most leaves and petals would not be colourable.
- `tools/art/clipart.ts` `addClipart`: a small part whose outline collapses to almost no area when grown (a thin sliver folding over itself) now stays white instead of failing the import (Morning Glory, Chamomile). This only changes parts that the validator would reject, so existing pages are unaffected.

**Verified:** all 42 imported with 0 errors; colour-filled previews of all 42 checked by eye. Typecheck ok, lint ok, 1007/1007 tests, 662/662 pages valid.

**Open:** the Simple Flowers licence record, as above.

## 2026-11-25: Flowers cover is the Daisy

**Changed:** `content/themes.json` Flowers cover `bloom-sunflower` → `bloom-daisy` (owner request).

**Verified:** typecheck ok, 1007/1007 tests, 662/662 pages valid.

## 2026-11-25: Theme covers with a coloured-in background fill the card

**Changed:** when a child had coloured a cover picture's background (Space, Animals, Vehicles), the theme picker showed that colour only on the page rectangle, with white bands and the card's white frame around it. `PageThumbnail` (fit `content`) now fills its whole box with the background's colour, and `CatalogPager`'s `ThemeCard` drops the white frame (`bleed`) when the cover's background is coloured. Covers without a coloured background look as before.

**Verified:** typecheck ok, lint ok, all tests pass; checked on the iPad simulator (Space and Animals cards fill edge to edge; the others unchanged). Vehicles sits on the next picker page and uses the same code.

## 2026-11-25: Space replaced with the owner's new space pack (25 pages)

**Changed:** the owner asked to replace the Space pictures with a new pack they have permission to use ("replace space svgs with these"). The 61 `space-<nn>` pages, their SVGs and sources (`art/svg/space/source/`) are removed; 25 new `orbit-<name>` pages come from `~/Desktop/Little Color World/Space/01_mercury.svg` to `25_comet3.svg` (the nine planets, four astronauts, three rockets, moon, two UFOs, two satellites, sun, space shuttle, moon rover, comet). Made like Flowers and Sea Animals: lines over 10.5 trimmed to 10.5 (`tools/space/thin_all.sh`, sources copied to `art/svg/space/pack/`), thinner lines, eyes and dots as drawn, every white area colourable, no background, big and centred (`tools/space/generate.ts`). The old generator is kept as `tools/space/generate-retired.ts` (its sources are gone).
- Closing line added for 16 Lift Off: the smoke cloud was open between its two middle puffs, so it filled the background.
- The Space cover is now `orbit-rocket` (was `space-70`). Children's saved colourings of the removed pages are no longer shown, the same as for the earlier pack replacements.
- `art/PROVENANCE.md`: 25 `orbit-*` rows; the old rows are marked removed.
- Not updated: `tools/store/colors.json` (store screenshot colours) still names `space-70`, and already named the removed `sea-orca`. Update it before the screenshots are next remade.

**Verified:** all 25 imported with 0 errors; leak map and colour-filled previews of all 25 checked by eye. Typecheck ok, lint ok, 971/971 tests (36 fewer pages, so 36 fewer per-page tests), 626/626 pages valid. Not yet checked in the simulator.

**Open:** record the space pack's seller, permission text and whether it covers App Store screenshots.

## 2026-11-25: Christmas cover pattern fills the card

**Changed:** a coloured cover background that is a pattern (the Christmas tree's red dots) stopped at the page rectangle, so the white card showed around it. A solid colour already covered the card because the page is larger than the drawing. `PageThumbnail` now paints that same background fill across the whole cover, outside the page clip, so the pattern continues to the border.

**Verified:** typecheck and lint clean; 972/972 tests, including `viewRectInPage`. Not yet checked on the simulator.
