# Artwork Pipeline

Status: **manual Inkscape path built (2026-10-29).** `npm run lcw` imports Inkscape SVGs, validates them, writes page JSON, and renders previews. Automatic regionization and the HTML review sheet are still to come.

## Why a pipeline at all
An ordinary SVG, whether AI-generated or auto-traced, is **not** a coloring page. Typical problems:
- Outlines are often filled shapes or tiny fragments rather than closed regions, so there is nothing to tap.
- Regions are open, overlapping, or split into dozens of slivers.
- Nested transforms, `<use>`, masks, filters, text, and clip paths.
- Line weights vary or are too thin for toddlers.

So the pipeline must **produce** enclosed fill regions with stable IDs, separate from the outline layer, and **validate** them.

## Stages
```
1. Generate/Import   AI image or vector tool → raw SVG (developer-side only)
2. Normalize         flatten transforms, convert shapes→paths, absolute coords, viewBox fit, strip unsupported
3. Regionize         derive fill regions (see below), assign IDs, order
4. Validate          schema + geometry rules → errors/warnings report
5. Preview           render PNG thumbnail + debug overlay (each region a random color, IDs labelled)
6. Review            human approves in a local HTML review sheet
7. Export            normalized ColoringPage JSON + preview → content/<pack>/
```

### Authoring convention (recommended path)
Author or repair the SVG in a vector editor (Inkscape, free) with two groups:
- `<g id="outline">`: stroked paths, black, uniform width of at least 6 units on a 1024 viewBox.
- `<g id="regions">`: closed filled paths, each with `id="body"`, `id="leg-front"`, and so on.

The CLI then trusts these groups. This is far more reliable than inferring regions automatically and is the default path.

### Automatic regionization (assisted, Phase 3+)
For outline-only art: rasterize the outline at high resolution, flood-fill the enclosed areas, vectorize each area (marching squares + simplification), and expand each one to the outline centerline. The output **always** goes through human review and is never auto-published.

## Allowed SVG input subset
`svg, g, path, rect, circle, ellipse, polygon, polyline, line`, with the attributes `d, transform, fill, stroke, stroke-width, stroke-linecap, stroke-linejoin, fill-rule, id, viewBox`.
**Rejected:** `text, image, use, symbol, mask, clipPath, filter, pattern, foreignObject, style` blocks with selectors, `script`, external references, and CSS animations.

## Validation rules (errors block export)
| Rule | Default |
|---|---|
| Schema valid (zod) | — |
| Unique region IDs matching `^[a-z][a-z0-9_-]*$` | — |
| Every region subpath closed | — |
| Region area ≥ min (age 2–3: 0.4% of page; 4–5: 0.15%) | warning below, error below half. Tuned on the first dinosaur (smallest plate ≈ 0.6%) |
| Outline stroke width ≥ min (2–3: 8 units; 4–5: 6 units, per 1024 of width) | error |
| Region count (2–3: ≤ 25; 4–5: ≤ 80) | warning |
| No NaN/huge coordinates, all inside viewBox ± stroke | error |
| Region IDs stable vs previous published version | error if an ID disappears without `--allow-removed` |
| Every pixel inside the outline belongs to some region (coverage ≥ 99%) | warning |
| File size ≤ 300 KB JSON | warning |

## Drawing a page in Inkscape
1. Copy `art/templates/coloring-page-template.svg` to `art/svg/<theme>/<page-id>.svg` (for example `art/svg/animals/elephant-01.svg`) and open it in Inkscape.
2. Import your sketch or AI image into the **reference** layer (File > Import, choose "Link", not "Embed"). That layer is ignored by the importer.
3. On the **regions** layer, trace each colorable area as its own closed shape with the pen tool. Shapes may overlap: later shapes sit on top, so draw the background (sky, ground) first.
   - Name every shape in Object > Object Properties > **Label** (`body`, `ear-left`). Shapes with the same label, or inside a labelled group, become one region.
   - Give region shapes a dark stroke of **10** (minimum 8). The stroke becomes the outline, so nothing is drawn twice.
   - Overlap freely. Where a later shape covers an earlier one (ears behind the head, ground behind the body), the importer trims the hidden part of the earlier shape's stroke, because outlines always render above fills. Strokes on the **outline** layer are never trimmed. To make two parts color as one with no line between them (a head and its trunk), draw them as one shape.
4. Put locked, pre-colored bits (pupils, nose) on the **details** layer with a solid fill. Children cannot color these.
5. Draw extra lines (smile, whiskers) on the **outline** layer: stroke only, no fill, round caps.
6. Save as **Inkscape SVG**, then import:
   ```
   npm run lcw -- page import art/svg/animals/elephant-01.svg --theme animals --title "Elephant"
   ```
7. Open `art/previews/<id>.debug.png`. Every region has its own color and label. White patches are gaps nobody can fill, and tiny colored bits are slivers. Fix the SVG and import again.
8. Record the page in `art/PROVENANCE.md`.

Tips: use Path > Object to Path on text you draw (text is rejected). Avoid clips and masks. Keep the subject large and centered. Avoid Path > Stroke to Path on outlines: outlines must stay strokes.

## CLI (`tools/lcw`)
```
npm run lcw -- page import <file.svg> --theme <id> [--id <page-id>] [--title "Title"] [--subtitle "Line under the title"] [--age 2-3|4-5|all] [--allow-removed]
npm run lcw -- page validate [content/pages/<id>.json ...]   # all pages when no file is given
npm run lcw -- page preview <page-id>                         # art/previews/<id>.png and <id>.debug.png
npm run lcw -- page export-svg <page-id> [--out file.svg]     # editable SVG of an existing page
npm run lcw -- index                                          # regenerate src/content/bundledPages.ts
```
- **import:** the page id defaults to the file name. Re-importing keeps theme, title, subtitle and age from the existing JSON and bumps `version` only when something changed. Removing or renaming an existing region id is an error unless `--allow-removed` is passed, because saved colorings refer to those ids. Nothing is written when there are errors. On success it writes `content/pages/<id>.json`, regenerates `src/content/bundledPages.ts` (the app's page list), and renders previews.
- **Hidden strokes:** strokes on region and detail shapes are cut where a shape painted later covers them. Shapes that share a name are one region, and they cover each other both ways, so the region gets a single outline around the outside with no seams inside. If those shapes are traced in opposite directions, the import warns, because their overlap would be an unfillable hole (fix it with Path > Reverse). The cut uses the final paint order: regions first, merged by name, then details. Cut strokes are stored as polylines (2-unit steps, 0.1 precision). Uncovered strokes keep their curves.
- **Conversion:** transforms are baked into coordinates, shapes become paths, arcs become cubic curves, and numbers are rounded to 0.01. Stroke widths scale with transforms and are rounded to 0.5. Outlines with identical stroke settings merge into one entry. Caps and joins default to round.
- Written in TypeScript and run with `tsx`. It reuses `src/content/schema` (including `validatePage`) and `src/engine/geometry` from the app, so the app and the CLI cannot disagree about validity. Previews render with `canvaskit-wasm` (the same Skia as the app). Labels use Arial Bold from macOS and are skipped if it is missing.
- Previews are gitignored. SVG sources in `art/svg/` are committed.

## Generated pages (Shapes and Animals)
Some pages are drawn in code from basic shapes instead of in Inkscape:
- `tools/shapes/generate.ts` makes the 30 Shapes pages.
- `tools/animals/generate.ts` makes the 20 Animals pages (`animal-01` to `animal-20`) from the owner's cute animal clipart (MeadMor0074–0124) in `art/svg/animals/cute-source/`, converted like the Dinosaurs (`tools/art/clipart.ts`): no background, each animal big and centred (owner, 2026-11-02). The earlier scene pages (`animal-<name>-01`) were replaced; their generator is kept as `tools/animals/scenes-legacy.ts` for reference and the rest of this paragraph describes it. The clipart draws lines as filled black shapes with holes. The generator scales each animal onto the page so it stands on the ground, and splits the shapes by nesting depth. Odd depths are holes: they become fillable parts, or white locked details if smaller than 0.4% of the page. Everything black becomes one locked even-odd detail, drawn exactly as is with no extra stroke. The clipart's lines are about 10 units on the page, like the scenery's. Parts carry no outline of their own and are grown 2 units outward, so they tuck under the black line and no pale seam shows. A generated scene goes around the animal; its outlines are the ones the validator measures.
- `tools/dinosaurs/generate.ts` makes the 54 Dinosaurs pages (`dino-01` to `dino-30` plus a chosen subset of 31-85) from the owner's "Cute Dino" clipart in `art/svg/dinosaurs/cute-source/`, converted like the Unicorns (`tools/art/clipart.ts`): no background, each dinosaur big and centred (owner, 2026-11-02). The earlier scene pages (`dino-<name>-NN`, jungle scene with one palm) were replaced; their generator is kept as `tools/dinosaurs/scenes-legacy.ts` for reference and the notes below describe it.
- Both use the shape helpers in `tools/art/primitives.ts` and the SVG writer in `tools/art/layered.ts`.

They write Inkscape-convention SVGs to `art/svg/<theme>/`. Run with `--import` to also import each page. Add `--allow-removed` only when renaming regions is intended, which is fine before a page has shipped. `--only cat,bear` limits a run to some pages, and `--out <dir>` writes the SVGs somewhere else without importing (for trying out a style without changing the app). Change a generated page in its generator and re-run: hand edits to its SVG are overwritten. The hand-drawn pages, such as `animal-elephant-01` and `animal-lion-01`, are not touched.

## AI prompt guidance (for generation)
"Children's coloring page, single friendly {subject}, {theme}, thick uniform black outlines, very large simple shapes, no shading, no hatching, no text, no background clutter, white fill, centered, cute rounded proportions, suitable for age 2–4."
AI output is a **starting point**. Expect to redraw or repair it in Inkscape before import. Keep a record of each asset's provenance (tool, prompt, date, and any human edits), because App Review and copyright questions may come up.

## Content QA checklist (human)
- [ ] Recognizable at thumbnail size
- [ ] No scary or violent imagery, no brand or character likeness
- [ ] Every intended area is tappable (check the debug overlay)
- [ ] No sliver regions near joints
- [ ] Looks good fully colored with the rainbow preset

### Every part colourable (dinosaurs, 2026-11-01)

`addClipartRegions` (tools/art/clipart.ts) builds regions from the white areas themselves rather than from the
clipart's holes:
- **Closing lines.** Traced clipart often leaves a shape open (a leg's line stops short of the body), so the leg and body
  would fill together. Each page lists `close` lines in the source file's coordinates (`tools/dinosaurs/generate.ts`);
  they are drawn at the line thickness before the areas are found. Find candidates by eye on a zoomed render.
- **Areas.** Every separate white area inside the drawing's outline is a region, biggest first. An area under the page
  minimum (0.15%, so dinosaur pages are marked 4-5) joins the smallest region it touches (a far arm colours with the
  near arm); under 0.05% it stays white (highlights, gaps between toes).
- **Ridges and spots.** Black thicker than a line (not eyes) is redrawn as an outline as thick as the lines, centred on
  its old edge and kept inside the drawing's outline; tiny loops drawn inside a ridge are filled in. Each opened shape of
  at least 0.006% of the page is its own region named `small-N`. The importer marks ids starting with `small-` as
  `small: true`, and the validator then allows them down to 0.006% (`SMALL_MIN_AREA`) instead of the age band minimum.

**Applied to all 25 dinosaurs (2026-11-01).** Each page in `tools/dinosaurs/generate.ts` lists its `close` lines (hips,
shoulders, a neck or frill line, a wing root) and, where needed, `spots` (highlighted spots that are not eyes). Rules
in `addClipartRegions`:
- Eyes are the biggest round solid shape with a small white highlight, plus a second one next to it; other
  highlighted shapes (spots, an open mouth) and rings with a big white middle are coloured like spots.
- Loose solid spots get a line-thick outline; thin solid shapes (eyebrows, curls) stay lines.
- Every small closed area that is not an eye highlight (a spike, a far leg, a toe) is its own `small-N` region.
- The white areas come from a raster-checked path difference: Skia's path ops occasionally return a wrong shape on
  large traced paths, so the result is compared with a rendered one and retried with nudged inputs.

**Vehicles (2026-11-02).** `tools/vehicles/generate.ts` makes 30 pages (`vehicle-<name>-01`) from owner-supplied clipart in
`art/svg/vehicles/source/`, with the same converter (`eyes: false`: round windows and lights are coloured, not kept
black). Each vehicle gets a setting: the Happy Car road (default; `--road town|country` for the other two samples),
sea, sky, under the sea, rails, snow or farm. The sky is the Happy Car's (sun top left, cloud top right) plus one or two
small clouds and birds placed clear of the vehicle. Scenery that passes behind a vehicle (rails, field furrows) is made
of shapes, not lines, because lines are always drawn above every fill.

**Sea Animals (2026-11-02).** `tools/sea-animals/generate.ts` makes 100 pages (`sea-<name>`) from the owner's "Cute Sea
Animals" clipart (Illustrator exports, `art/svg/sea-animals/source/NNN.svg`), with the same converter. The background is
minimal at the owner's request: swimmers and sea-floor things get a sandy seabed and a short column of bubbles each side
(`sea`), shore animals (seals, otters, penguins, gulls) only the sand (`shore`), and pictures that already have scenery,
plus plants, shells and boats, nothing (`none`). Two converter options were added for this clipart: `minCore` (1500
here, default 40) leaves the blobs where its brush lines swell at joins as drawn instead of opening them into tiny
beads, and `maxRegions` (80, the 4-5 limit) merges the smallest leftover small parts into one region on busy pages.
Pages with no scene have no outline strokes: their lines are the locked artwork region, which the schema now allows.
The solid-black orca (source 37) is not used: opening its black body loses its face (the second orca, source 38, is).

## Insects

`npx tsx tools/insects/generate.ts --import` converts the owner's insect clipart (`art/svg/insects/source/<name>.svg`) the same way as Sea Animals. It draws no background (owner, 2026-11-02). Each bug is fitted big and centred with `loadClipart`'s `centerY` option (690 × 930 box at the page centre). The scenery pieces in the same pack are not used.

## Unicorns

`npx tsx tools/unicorns/generate.ts --import` converts the owner's Unicorn Bundle (`art/svg/unicorns/source/unicorn-<nn>.svg`, from `~/Downloads/UnicornBundle/Svg/Svg-<nn>.svg`). Each unicorn is drawn big and centred with no background, like Insects. The pack repeats outlines many times, so the generator calls `loadClipart(..., { dedupe: true })`. That drops near-identical copies, because stacked copies flip the even/odd artwork-or-hole parity and make the converter very slow. A page's `minCore` can be lowered so that small solid black parts, like 07's hooves, become colourable.
