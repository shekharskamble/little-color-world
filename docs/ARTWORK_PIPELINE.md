# Artwork Pipeline

Status: **design only.** Phase 1 uses one hand-authored dinosaur. The CLI is built in Phase 3.

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

## CLI (Phase 3)
```
npx lcw page import  art/raw/stego.svg --theme dinosaurs --id dino-stegosaurus-01 --age 2-3
npx lcw page validate content/dinosaurs/dino-stegosaurus-01.json
npx lcw page preview  content/dinosaurs/dino-stegosaurus-01.json   # PNG + debug overlay
npx lcw review        content/dinosaurs                              # opens local review sheet
npx lcw page new      --subject "friendly stegosaurus" --theme dinosaurs   # later: AI prompt helper
```
- Written in TypeScript, run with `tsx`. It reuses `src/engine/geometry` and `src/content/schema` from the app, so the app and the CLI cannot disagree about validity.
- Preview rendering uses `canvaskit-wasm`, already installed as a Skia dependency. A prototype renderer produced the first dinosaur's debug and colored previews on 2026-10-17.

## AI prompt guidance (for generation)
"Children's coloring page, single friendly {subject}, {theme}, thick uniform black outlines, very large simple shapes, no shading, no hatching, no text, no background clutter, white fill, centered, cute rounded proportions, suitable for age 2–4."
AI output is a **starting point**. Expect to redraw or repair it in Inkscape before import. Keep a record of each asset's provenance (tool, prompt, date, and any human edits), because App Review and copyright questions may come up.

## Content QA checklist (human)
- [ ] Recognizable at thumbnail size
- [ ] No scary or violent imagery, no brand or character likeness
- [ ] Every intended area is tappable (check the debug overlay)
- [ ] No sliver regions near joints
- [ ] Looks good fully colored with the rainbow preset
