# Architecture

Status: **approved 2026-10-17; Phases 0–1 implemented.** Decisions marked ⚖️ include trade-offs. Section 13 lists API facts verified against the installed packages.

## 1. Stack (verified against npm on 2026-10-17)

| Concern | Choice | Version pinned by Expo SDK 58 |
|---|---|---|
| Runtime | Expo SDK 58, React Native 0.88, React 19.3 | expo 58.0.x |
| Language | TypeScript, `strict: true`, `noUncheckedIndexedAccess: true` | — |
| Navigation | Expo Router | ~58.0.20 |
| Rendering | @shopify/react-native-skia | 2.14.0 |
| Gestures | react-native-gesture-handler | ~3.3.0 (**new major, v3 API**) |
| Animation | react-native-reanimated + react-native-worklets | 4.7.1 / 0.13.0 |
| Storage | expo-sqlite, expo-file-system | ~58.0.13 / ~58.0.9 |
| Hashing | expo-crypto (Phase 5) | ~58.0.6 |
| Validation | zod 4 | 4.6.x |
| State | zustand 5, only for cross-screen UI state | 5.0.x |
| Tests | jest-expo, @testing-library/react-native | per SDK |

Always install native packages with `npx expo install <pkg>` so versions match the SDK, then run `npx expo-doctor`.

⚖️ **SDK 58 vs 57.** SDK 57 is more battle-tested (3.5 months, 30 patches). SDK 58 has a longer support window and is the SDK the App Store Expo Go app supports, which lets us iterate on a real iPad before we need native builds. Its risk is Gesture Handler v3 and a Skia release that is only two weeks old. **Recommendation: SDK 58**, with an early spike (Milestone 0.2) that proves Skia + RNGH 3 + Reanimated work together. If the spike fails, fall back to SDK 57.

**Excluded on purpose:** expo-updates (OTA JS), any analytics/crash SDK, Firebase/Supabase, ad SDKs, expo-notifications, expo-tracking-transparency.

## 2. Layering

```
src/app/                  Expo Router screens (thin: compose components, call hooks)
src/ui/                   Design system: tokens, Button, Card, IconButton, Palette…
src/features/<feature>/   Feature UI + hooks (coloring, tracing, drawing, gallery, stickers, parents, content-updates)
src/engine/               PURE TypeScript, no React / RN / Skia imports
  geometry/               SVG path parsing, flattening, bounds, point-in-polygon, distance
  coloring/               ColoringDocument state, commands, history reducer
  fills/                  FillStyle union + presets (data only)
  tracing/                Path-following scoring (Phase 4)
  drawing/                Stroke model, simplification, stroke-erase intersection (Phase 4)
  procedural/             Seeded scene composition (Phase 6)
src/render/               Skia adapters: FillStyle → Paint/Shader, page → Skia Paths, cached Pictures
src/content/              Zod schemas, registry (bundled + downloaded), loaders
src/persistence/          SQLite client, migrations, repositories
src/platform/             Thin wrappers: haptics, audio, app-state, file paths
content/                  Bundled page source data (JSON + preview PNG)
tools/                    Node CLIs: validate, normalize, preview, publish (share src/engine + src/content)
```

**Rule:** `src/engine` and `src/content/schema` must import nothing platform-specific. That keeps them unit-testable in plain Jest and reusable by the Node CLIs. ESLint `no-restricted-imports` enforces the boundary.

## 3. Coloring page data model (initial content schema, v1)

A coloring page is **our own normalized JSON**, not raw SVG at runtime. SVG is only an *input* to the pipeline (see ARTWORK_PIPELINE.md).

```ts
// src/content/schema/page.ts (zod; types inferred)
const RegionId = z.string().regex(/^[a-z][a-z0-9_-]{0,47}$/);   // stable forever within a page id

const Region = z.object({
  id: RegionId,
  d: z.string(),                       // SVG path data, closed subpaths only, absolute after normalization
  fillRule: z.enum(['nonzero', 'evenodd']).default('nonzero'),
  defaultFill: FillStyle.optional(),   // usually white; e.g. pre-colored eyes
  locked: z.boolean().default(false),  // non-fillable decorative region
  label: z.string().optional(),        // dev/a11y only, never shown to kids
});

const OutlinePath = z.object({
  d: z.string(),
  strokeWidth: z.number().min(4).max(40),     // in page units; enforces "thick lines"
  lineCap: z.enum(['round', 'butt', 'square']).default('round'),
  lineJoin: z.enum(['round', 'miter', 'bevel']).default('round'),
});

const ColoringPage = z.object({   // implemented in src/content/schema/page.ts (also has outlineColor)
  schemaVersion: z.literal(1),
  id: z.string(),                       // e.g. "dino-stegosaurus-01"
  version: z.number().int().positive(), // immutable content version
  themeId: z.string(),
  title: z.string(),                    // parent-facing only
  ageBand: z.enum(['2-3', '4-5', 'all']),
  viewBox: z.tuple([z.literal(0), z.literal(0), z.number().positive(), z.number().positive()]),
  background: z.string().regex(/^#[0-9a-f]{6}$/i).default('#ffffff'),
  regions: z.array(Region).min(1).max(200),  // ARRAY ORDER = DRAW ORDER (first = bottom)
  outline: z.array(OutlinePath).min(1),      // always drawn above all fills
  preview: z.string(),                        // relative file name of PNG thumbnail
});
```

Design notes:
- **Coordinates are pre-normalized** into the page `viewBox` by the pipeline. There are no nested transforms at runtime, which removes a whole class of hit-testing bugs. "Respecting transforms" then only means the single view transform (fit-to-screen + optional zoom/pan).
- **Region geometry extends to the outline centerline.** Fills therefore tuck under the black stroke and never show a white seam. Because the outline renders last, nothing can paint over it.
- **Draw order is array order.** Hit testing walks it in reverse (topmost first).
- `version` + immutable files: saved artwork records `(pageId, pageVersion)`. A newer version never rewrites an old one. Region IDs must stay stable across versions; fills for removed IDs are dropped on load.

### Theme and pack
```ts
const Theme = z.object({ id, title, icon /* png */, color /* card tint */, order: z.number() });
const ContentPack = z.object({
  schemaVersion: z.literal(1), id, version, minAppVersion: z.string(),
  themes: z.array(Theme), pages: z.array(z.object({ id, version, file, sha256, bytes })),
});
```

## 4. Fill styles

A serializable discriminated union, shared by the engine, persistence, and renderer:

```ts
type ColorHex = `#${string}`;
type FillStyle =
  | { type: 'solid'; color: ColorHex }
  | { type: 'linear'; stops: Stop[]; angle: number }            // angle in degrees
  | { type: 'radial'; stops: Stop[]; center?: [number, number] } // center in 0..1 of region bbox
  | { type: 'pattern'; patternId: PatternId; fg: ColorHex; bg: ColorHex; scale: number }
  | { type: 'texture'; textureId: TextureId; color: ColorHex };
type Stop = { offset: number; color: ColorHex };
type PatternId = 'dots' | 'stripes' | 'stars' | 'hearts' | 'checker' | 'zigzag' | 'confetti' | 'dino-scales';
type TextureId = 'crayon' | 'chalk' | 'watercolor' | 'glitter';
```
- **Phase 1 implements only `solid`.** The zod union in `src/content/schema/fill.ts` has a single member, and Phase 2 adds the others. Saved data is parsed with this schema, so new members must be additive.
- Presets (sunset, ocean, candy, magic, rainbow) are just named `FillStyle` constants. Rainbow is a multi-stop linear gradient.
- **Gradients are laid out in region-bounding-box space.** A rainbow therefore looks right on a tiny claw and on a huge body alike.
- **Clipping is inherent.** Each region is drawn as `drawPath(regionPath, paintWithShader)`, so the shader can only appear inside the path. No `clipPath` stack is needed, which is faster and has no anti-alias bleed.
- Patterns are generated at runtime as small Skia Pictures turned into repeating image shaders (no PNG assets, crisp at any zoom). Textures are bundled grayscale tiles combined with a color via a blend mode. Glitter uses a bundled SkSL runtime effect. Shader code is part of the app binary and is **never** downloaded.
- An unknown `patternId`/`textureId` (for example, from a newer content pack) renders as a solid fallback instead of crashing.

## 5. Hit testing ⚖️

**Decision:** pure-TypeScript geometry in `src/engine/geometry`, not Skia's `SkPath.contains`.

- At page load, each region path is parsed and flattened once (béziers turned into polylines at a tolerance tied to the viewBox), and its bounds are cached.
- Tap → inverse view transform → page coordinates → iterate regions top-to-bottom → bbox reject → winding/even-odd point-in-polygon.
- **Toddler forgiveness:** if the tap lands on a black outline (common, since lines are thick), pick the nearest non-locked region within a tolerance radius (≈ the outline half-width + 8 pt in screen space). Taps on empty background do nothing.
- Why not Skia: the same code then runs in Jest and in the Node validation CLI (closed-path checks, minimum region area, tiny-region detection), and stays deterministic. The cost is duplicated path parsing and possible sub-pixel disagreement with Skia's rasterizer at edges, which is irrelevant at toddler accuracy.

## 6. Editing commands and undo/redo

```ts
type EditCommand =
  | { kind: 'fill';  regionId: string; before: FillStyle | null; after: FillStyle | null } // null = default
  | { kind: 'reset'; before: Record<string, FillStyle> };      // undoable reset
interface History { past: EditCommand[]; future: EditCommand[]; limit: 100 }
```
- State = `Record<regionId, FillStyle>` (only non-default regions are stored).
- `apply` pushes onto `past`, **clears `future`**, and trims to 100 entries (requirement: at least 50).
- Undo pops `past` → applies inverse → pushes onto `future`. Redo is the mirror.
- The eraser is just `fill` with `after: null`. Re-filling a region with an identical style is a no-op and records nothing.
- Memory: each command is around 100 bytes, so 100 commands is about 10 KB. No bitmaps are stored.
- The whole module is a pure reducer, which makes it exhaustively unit-testable.
- Freehand strokes (Free Drawing, Phase 4) add `{kind:'stroke'}` and `{kind:'eraseStrokes', removed: Stroke[]}`. Stroke erasing removes whole strokes it intersects (an object eraser), so no raster history is needed.

## 7. Rendering pipeline (Skia)

```
<Canvas>
  <Group transform={viewTransform /* Reanimated shared value */}>
    background rect
    regions.map → <Path path={cachedSkPath[id]} paint={paintFor(fills[id] ?? default)} />
    <Picture picture={cachedOutlinePicture} />   // recorded once per page
  </Group>
</Canvas>
```
- SkPaths and the outline SkPicture are built once per page and memoized.
- Changing one region's fill re-renders only that `<Path>`, because region components are memoized by `(id, fill)`.
- Pan and zoom (optional for ages 4–5, off by default for ages 2–3) run on the UI thread via Reanimated. Taps go through `runOnJS` for hit testing, since taps are rare events.

## 8. Persistence ⚖️

**SQLite** (expo-sqlite) for structured records and **files** for large blobs (thumbnails, downloaded content, drawing stroke data over about 64 KB).

Initial schema (migration 1):
```sql
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);           -- schema_version, etc.
CREATE TABLE artwork (
  id TEXT PRIMARY KEY,               -- uuid
  kind TEXT NOT NULL CHECK (kind IN ('coloring','tracing','drawing')),
  page_id TEXT, page_version INTEGER,
  state_json TEXT NOT NULL,          -- {fills:{...}} | {strokes:[...]} (versioned payload)
  thumbnail_path TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',   -- in_progress | completed
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX artwork_page ON artwork(page_id, updated_at DESC);
CREATE TABLE preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
-- later migrations: stickers, achievements, installed_content, generated_scenes
```
- Migrations are an ordered array of `{version, up(db)}` run in a transaction at startup, tracked with `PRAGMA user_version`.
- **Autosave:** debounced about 1.5 s after the last edit, plus an immediate flush on screen blur, unmount, and when the app goes to the background (`AppState`). Each save is one `UPSERT` of a few KB, so a session of 200 taps produces roughly 10–30 writes.
- Repositories depend on a small `SqlDatabase` interface (`src/persistence/sql.ts`). expo-sqlite satisfies it in the app, and `node:sqlite` satisfies it in Jest, so repository and migration tests run real SQL.
- Undo history is **session-only** (not persisted) in Phase 1, and fills are restored on reopen. This is a deliberate simplification; it can be revisited later.
- "Restore unfinished artwork": opening a page loads its most recent `in_progress` artwork row, if any.

## 9. Content registry

- **Bundled** packs: JSON imported at build time (Metro) plus `require()`d preview PNGs. Always available and cannot be deleted.
- **Downloaded** packs: `documentDirectory/content/packs/<packId>/<version>/`, recorded in the `installed_content` table. See CONTENT_DELIVERY.md.
- `ContentRegistry` merges both, prefers the highest installed version for *new* artwork, and resolves `(pageId, version)` exactly for existing artwork.
- Pages are loaded lazily by id. The registry index holds only metadata and preview paths.

## 10. App state

- Coloring screen state (fills, history, selected fill) lives in a `useReducer` local to the screen, backed by the pure engine reducer. Zustand is **not** used here.
- Zustand is used only for genuinely cross-screen state: preferences (sound on/off), and the sticker toast queue. It is optional; it is added only when the need is concrete.

## 11. Routes (Expo Router)

```
src/app/_layout.tsx             root: gesture root, SQLiteProvider (runs migrations), error boundary
src/app/index.tsx               Home
src/app/themes/index.tsx        Theme Selection
src/app/themes/[themeId].tsx    Page Selection (thumbnails show saved progress)
src/app/color/[pageId].tsx      Coloring Canvas
src/app/trace/index.tsx         Trace and Color            (placeholder, Phase 4)
src/app/draw/index.tsx          Free Drawing               (placeholder, Phase 4)
src/app/creations/index.tsx     My Creations               (placeholder, Phase 4)
src/app/stickers/index.tsx      Sticker Collection         (placeholder, Phase 4)
src/app/parents/index.tsx       Parents Area; gate added with its first real content (placeholder)
src/app/new-pictures.tsx        New Pictures, NOT gated per D7 (placeholder, Phase 5)
```
Navigation depth is at most 3 taps from Home to a canvas.

## 12. Security and privacy boundaries
- The only network code lives in `src/features/content-updates` and is called only from a parent-gated screen.
- Host allowlist and HTTPS are enforced in code. There is no `NSAllowsArbitraryLoads`.
- No permissions requested in v1 (no camera, photos, microphone, or location). Exporting to Photos, if ever added, would be parent-gated and would add the Photos add-only permission.
- A release-build network audit (Proxyman/Charles plus `nettop`) is a Phase 7 gate.

## 13. Verified API notes (SDK 58, checked against installed types 2026-10-17)
- **TypeScript 6.0** no longer auto-includes `@types/*`, so `tsconfig.json` lists `"types": ["jest", "node"]`.
- **Gesture Handler 3.3:** hook API: `useTapGesture({ maxDistance, runOnJS: true, onActivate: (e) => e.x/e.y/e.numberOfPointers })` plus `<GestureDetector gesture={…}>`. Callbacks are worklets unless `runOnJS: true`.
- **Skia 2.14:** `SkPath` is immutable (no `setFillType`). Pass `fillType="evenOdd"` on `<Path>`. `Skia.Path.MakeFromSVGString` returns `null` on bad input.
- **Reanimated 4.7 / Worklets 0.13:** use `sv.set()`/`sv.get()` (React Compiler lint), and `scheduleOnRN` from `react-native-worklets` to call JS from a worklet. `babel-preset-expo` configures the plugin automatically, so there is no babel.config.js.
- **expo-sqlite 58:** `<SQLiteProvider onInit useSuspense>` + `useSQLiteContext()`. `onInit` must return `Promise<void>`.
- **ESLint (eslint-config-expo 58)** includes React Compiler rules: no ref reads or writes during render.
- `react-dom` is pinned to the SDK's React version, because expo-router's optional peer otherwise resolves to a mismatched release.
