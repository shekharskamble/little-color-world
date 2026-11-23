# UX Guidelines

## Principles for ages 2–5
1. **No reading required.** Every child-facing control is recognisable by its illustration or icon. Text in child-facing UI is decoration for grown-ups only (screen titles, catalog name pills) and is never the only cue. Instructions and settings text live in the Parents Area.
2. **Big, forgiving targets.** Minimum 64×64 pt for child controls (Apple's minimum is 44 pt), 88 pt for primary actions. At least 16 pt spacing between targets.
3. **Nothing punishes.** There are no wrong answers, no fail sounds, and no timers. Mis-taps do nothing or do something harmless.
4. **Shallow navigation.** At most 3 taps from Home to any canvas. Back is always in the same top-left spot.
5. **Calm, not frantic.** Gentle spring animations (200–400 ms), soft pastel backgrounds, bright fills, no flashing (WCAG 2.3.1).
6. **Immediate feedback.** Each fill gives a fill animation (radial reveal, about 250 ms), an optional soft sound, and a light haptic.
7. **Accidental-touch resistant.** Ignore palm and multi-finger touches on the canvas. Destructive actions (Reset) need a confirm step (a sheet with ✕ and ✓) and must be undoable.
8. **Parents stay in control.** Settings, deletion, and any external link sit behind the parental gate. New pictures download by themselves when the app opens (decision D7, revised 2026-11-13) and show up first in the theme picker with a NEW badge; nothing downloads in the background.

## Layout: Coloring Canvas (landscape iPad)
```
┌───────────────────────────────────────────────────────────────┐
│ [◀ Back]       Page Title (subtitle)     [↶] [↷] [⟲ reset]    │  top bar, 72pt
│ ┌─────┐  ┌───────────────────────────────────────┐  ┌──────┐  │
│ │fill │  │                                       │  │color │  │
│ │type │  │            CANVAS (max area)          │  │palette│ │
│ │ ●   │  │                                       │  │ ● ● ● │ │
│ │ ◐   │  │                                       │  │ ● ● ● │ │
│ │ ▦   │  │                                       │  │ ● ● ● │ │
│ │ ✎   │  │                                       │  │ ● ● ● │ │
│ │ ⌫   │  └───────────────────────────────────────┘  │ eraser│ │
│ └─────┘                                             └──────┘  │
└───────────────────────────────────────────────────────────────┘
```
- The left rail selects fill type (solid, gradient, pattern, texture). The right rail shows swatches of the selected type. The eraser sits on the right rail as a distinct swatch.
- The selected swatch grows 1.1× (with clear space between it and its neighbours) and gets a white ring plus a drop shadow (selection must never be shown by color alone).
- Phase 1 shows only solid colors and the eraser. The fill-type rail appears in Phase 2.

## Reset confirmation
Tapping ⟲ opens an in-app sheet (not a system alert) with a large picture of the blank page and a big green ✓ that clears the picture on a **single tap** (owner decision 2026-11-02; it was press-and-hold for 1.5 s, which read as broken), plus an ✕. Reset is also undoable, so an accidental reset can be recovered.

## Palette and tools
- **Tabs, colour strip and tool rail** (owner request, 2026-11-03, third version, modelled on the owner's reference picture). Kids pick a tool and a paint; new kinds of paint never add tools.
  - **Paint buttons** (in the rail under the tools, 56 pt round, owner request 2026-11-03): what kind of paint the strip offers, each shown as a dot of that paint in the chosen colour: plain colours, glitter, patterns, rainbows. A tool only shows the buttons it can paint: the bucket all four, the brush plain and glitter, the pencil none (always plain). Shiny was removed by the owner (2026-11-03); shiny parts already coloured still show.
  - **Colour board** (left, owner's reference picture, 2026-11-03): a tan board (`#F6CF92`) with a golden-brown border (`#D9A04A`) and a darker brown right and bottom edge (`#B08A58`), colours sampled from the reference, holding one column of shiny 58 pt paint balls 16 pt apart (a darker rim and a white shine at the top left). Plain and glitter show the 69 colours with that finish; patterns shows every pattern in the chosen colour; rainbows shows the 12 blends. The chosen ball gets a white gap and an ink ring around it. It scrolls.
  - **Tool rail** (right, right next to the strip; **never needs to scroll**: its round buttons shrink by one factor to fit the iPad's height, sized for the fullest rail so they keep one size across tools, at least 65 % of full size, `src/features/coloring/railFit.ts`, owner report 2026-11-03 on an iPad Pro 11"): a light-blue rail with big round white buttons (84 pt) holding the owner's sticker pictures: paint bucket, brush, pencil and eraser (`assets/images/tool-*.png`). The picked tool gets a thick ink ring. The dividers between tools, paints and sizes have 6 pt above and below, so a picked ring never touches them (owner report 2026-11-03).
  - **Brush vs pencil** (owner decision 2026-11-03): the brush is the big painting tool: thick, smooth strokes in three sizes (18, 32 and 54 page units), or a glitter pen with the glitter paint. The pencil is always a fine 7-unit line with a light pencil grain, for details, and has no size buttons. Picking a paint after the eraser returns to the last paint tool.
- **Toy-coloured controls** (owner request, 2026-11-02). Each top-bar button has its own bright colour and is 88 pt: back is blue, camera pink, undo orange, redo purple and start over teal (was yellow; changed 2026-11-03 so its arrow is white like undo and redo). The camera button shows the owner's yellow toy-camera picture.
- **Camera** (pink button in the top bar): a white flash, a firm haptic, then a big preview of the picture with ✕ (back) and a big green ✓ (save to Photos). Saving shows a green tick, a star shower and a success haptic, then closes. If Photos access was refused, iOS never asks again, so small grown-up text and a plain "Open Settings" button (which goes to this app's page in Settings) replace ✓ (owner decision 2026-11-02, no gate). There is no real camera access.
- **Pens stay inside the lines:** a pen stroke stays inside the part where it starts, so outlines stay crisp and scribbles never spill. A single tap with a pen makes a dot. A second finger (or a palm) cancels the stroke in progress.
- **Brush thickness:** three round buttons the same size as the paint buttons (56 pt), each with a dot of the brush's actual paint (plain or glitter) at that thickness, at the bottom of the rail, shown only while the brush is on. Medium is the default.
- **Eraser** (in the rail): **one rule: touch a part and it goes back to white** (owner test with a 5-year-old, 2026-11-03: he could not tell when a tap cleared a part and when a drag rubbed out paint). A tap or a rub clears the whole part the finger lands on (its colour and its brush paint) when the finger lifts, and never touches the next part. One clear is one undo step, and touching a blank part does nothing. Picking a colour after the eraser returns to the previous paint tool. Every brush stroke, fill and erase is one undo step.
- Contrast: every swatch must stay distinguishable against the white page and the pastel UI.

## Visual direction: Toy Box (decided 2026-10-17)
Chosen over "Storybook World" (needs paid illustration) and "Calm Studio" (less legible for ages 2–3). Mockups: https://claude.ai/artifact/7DTKsPukYDKTLUjs1aZzhy
- **Pressable toys.** Every child control is a colored face on a darker lip (`src/ui/ToyButton.tsx`); pressing pushes the face down onto the lip.
- **Obvious first taps.** Home shows the rainbow "Little Color World" title and two big buttons side by side: green "Let's Color" (the catalog) and blue "Let's Trace" (Trace and Color; owner decision 2026-11-14, replacing the single button of 2026-10-29). The other activities (free drawing, creations, stickers), New Pictures and the Parents entry are hidden until they are built. Their routes still exist.
- **Trace and Color (2026-11-14).** Sets ABC, abc, 123 and Shapes (`/trace`), then a set's items (`/trace/set/<set>`): each thumbnail shows the child's coloring with their tracing ink over it, and a green check on finished ones. Tracing is saved as they go and reopens where they stopped. The tracing screen shows the letter as a chunky outlined shape with a dotted line along each stroke still to trace (owner choice: dots, like a worksheet). A pulsing green dot with an arrow sits where the current stroke starts and then leads at the end of the crayon ink. Strokes go in school order and direction; going off the path, backwards or skipping ahead just makes no progress (no failure state). Each finished stroke pops stars; the last one also brings the star shower and a big "Color it!" button that opens the same letter as a coloring page: one solid letter shape (owner, 2026-11-23: overlapping per-stroke parts looked ugly), with each big hole, like the two in B, a part of its own.
- **Icons are vector paths** (`src/ui/icons.ts`, drawn with Skia). No emoji in child-facing UI. Coming Soon placeholders still use emoji. Theme cards use the first page as cover art, or an empty image slot, until Phase 3 artwork.

## Theme: Sunny Meadow (decided 2026-10-29, applies app-wide)
Layered on top of Toy Box controls. Reference: a warm yellow catalog screen with a smiling sun, clouds, green hills, flowers, and white picture cards with thick colored borders.
- **Backdrop.** Every screen uses `Screen`, which draws `SunnyBackdrop` (`src/ui/SunnyBackdrop.tsx`): a warm yellow sky gradient, a smiling sun top-left, soft clouds, a dashed pink doodle, two rolling hills, and one bush in each bottom corner. Small critters only: two pairs of birds at the top, one bee above each bush (with a dotted trail), a purple butterfly on the left edge, and a pink one at the bottom center. **No trees, flowers, or grass.** Those were tried on 2026-10-29 and rejected as looking bad. It is vector art drawn with Skia rather than a bundled image, because no free, commercially safe image matched the look (the closest CC0 option, OpenGameArt "meadow background", is a realistic blue-sky field). The Coloring screen uses `scenery="sky"` (only the sky and clouds) so the page stays the focus.
- **Catalog cards** (`src/ui/CatalogCard.tsx`): a white card with radius 28, a 6 pt border in the theme's accent (`theme.color`), and a soft shadow. Above the bottom edge sits an accent pill with a 4 pt white outline that holds the name in white rounded heavy text. Page tiles use the same card without the pill. With no picture, the card shows an empty image slot (a dashed accent outline and a faint picture icon) until artwork exists.
- **Titles** (`src/ui/RainbowTitle.tsx`): chunky rounded heading with each letter in a different color (red, orange, yellow, green, blue, purple, pink), a white glow outline, and an optional dark subtitle.
- **Catalog layout:** horizontally paged (`src/features/catalog/CatalogPager.tsx`), 9 cards per page in a 3×3 grid. Each card is the biggest that fits three across and three down (aspect 1.5), and the grid is centred. A part-filled page keeps the grid columns (left-aligned). Children swipe, or tap the big orange ◀ ▶ arrows (80 pt) on either side; at the first and last page an arrow dims instead of disappearing. Each card shows its theme's `cover` page (`content/themes.json`, falling back to the first page), fitted to the drawing itself (`PageThumbnail fit="content"`), so it is as big as the card allows and never cropped. A theme without pages shows a dashed empty slot. The back button sits top-left. The heading is just the subtitle "Pick something fun to color" at 34 pt, centered on the back button's row (`RainbowTitle` with no `title`, using `subtitleFontSize`).
- **Coloring screen title.** The page's `title` sits centered in the top bar as a `RainbowTitle`, with the optional `subtitle` under it (for example "3 sides, 3 corners", or the shapes a picture is made of). It is for a grown-up to read aloud; it shrinks to fit on one line.
- **Page selection grid:** 3 cards per row (29% width, aspect 4:3). It scrolls vertically when a theme has more than two rows (Shapes has 30 pages).
- **Page artwork style (owner decision, 2026-11-01).** Animals are the owner's kawaii clipart: figurine-like animals with tiny dot eyes, a small nose and a "w" smile, used exactly as drawn. Each page places one animal standing on the ground in a scene that varies from page to page (sun, cloud, birds like the app background, flowers) and never covers it. There are no clothes and no pre-coloured pink. Rejected along the way: shape-built animals, sparkly eyes with blush, clothes, stick arms, animals hiding behind a bush, and the code-drawn figurines.
- **Pages are clipped to the page edge** (`PageArtwork`), so art that runs past the edge, such as an outlined ground, never shows outside it.
- **Pictures are full bleed (owner request, 2026-10-31).** On the Coloring screen the card takes the page's exact shape (plus its 3D lip) and the page fills it, with no padding or white letterbox bands. Page tiles in the theme grid (`CatalogCard bleed`, `PageThumbnail fit="cover"`) fill up to their accent border.
- **Hidden themes.** A theme with `"hidden": true` in `content/themes.json` is left out of the catalog. Its pages stay bundled and valid. Shapes is hidden (2026-10-31) until its artwork is reworked.
- **Theme accents** (`content/themes.json`): Shapes `#2BA89C` (hidden for now, see below), Animals `#5AA9F0`, Vehicles `#F08FB0`, Dinosaurs `#7CC35A`, Unicorns `#F2A93B`, Insects `#A07FE0` (replaced Princesses), Sea Animals `#F07F5A`, Space `#5A62D6`, Food `#2BB3A3`, Christmas `#D64545` (the last three have no pages yet).

## Color tokens
| Token | Value | Use |
|---|---|---|
| `bg.app` | `#FFF3D6` | warm sunny cream background |
| `bg.card` | `#FFFFFF` | canvas, palette panel, white buttons |
| `sand` | `#E5CF9C` | lip under white surfaces, hairlines |
| `ink` | `#2A2733` | outlines, icons |
| `tones.*` | blue `#3A7BEB`, yellow `#FFC93C`, green `#3DBE6B`, purple `#8A5CE6`, orange `#FF8A1F`, pink `#FF6FB1` | button faces, each with a darker lip |
| `tint.mint/sky/peach/lilac/lemon` | unchanged | legacy tints (theme screens now use the backdrop) |
| `scenery.*` | sky `#FFE48F`→`#FFF2C7`, sun `#FFD54A`/`#F2A81D`, hills `#D3E9A2`/`#B4DA7E`, bushes `#5FAE4E`/`#7DC45C` | Sunny Meadow backdrop |
Radii: cards 36 pt, buttons fully rounded, lip 8 pt (10–12 on large tiles). Typography: SF Pro Rounded (`ui-rounded`) for the wordmark; system font in the Parents Area, Dynamic Type supported.

## Sound and haptics
- Sounds are off by default, toggled in the Parents Area, and respect the iPad silent switch.
- Light haptic on every fill, brush stroke and erase; medium on the camera shutter; a success haptic when the whole picture is coloured and when a photo is saved. All are no-ops on iPads without a Taptic Engine (most iPads have no Taptic Engine, so this must degrade silently).

## Celebrations
**Built 2026-11-02:** every bucket fill pops five big stars (44–60 pt) from the tapped spot, and every brush stroke does the same where the finger lifts (about 1 s). Owner feedback 2026-11-02: fewer, bigger stars, and the brush too. When the child's own fill colours the last required part (every part except locked and `small` ones), big stars float up across the whole screen for 2.6 s. It never fires on load, undo or redo. Neither celebration takes touches, so colouring can go on. With Reduce Motion, the stars stay in place and only fade.

**Star colours (owner request, 2026-11-03):** the stars are painted with whatever the child just used: the colour, the pattern (a few small shapes in each star), the rainbow, gloss or glitter. A pen stroke's stars are in the pen's colour, and glittery for the glitter pen. The finishing shower uses the fill that finished the picture. Stars have a white edge, or an ink edge when the colour is very pale (white, cream) so they still show on the white page.

Still planned (Phase 4): completion is reached when a configured share of fillable regions, such as 80%, is colored, or when the child taps a ★ "done" button. It triggers a short confetti animation (under 2 s, no strobing), a star, and occasionally a sticker. Rewards are never withheld and never tied to time.

## Parental gate
- Shown before the Parents Area and any outbound link. **New Pictures is not gated** (decision D7).
- **Built 2026-11-03** (`src/ui/ParentalGate.tsx`, question logic in `src/engine/parentalGate.ts`), used before "Open Settings" in the camera sheet. A multiplication question with a number pad (for example, "7 × 6"), randomized each time. The factors are 3–9 and 4–9, so every answer has two digits. A wrong answer clears it and asks a new one; Cancel closes it. This is the pattern Apple reviewers commonly accept, and children aged 2–5 cannot pass it.
- The gate never blocks child activities.

## Upright iPad (owner decision 2026-11-03)
The app is landscape only, but iPadOS 26 can still show it upright when the iPad's rotation lock is off. Then a full-screen "turn me sideways" picture covers it (`src/ui/RotateHint.tsx`): the sky backdrop, a rainbow iPad that turns from upright to sideways in a slow loop, and a curved arrow over it. No words a child must read; VoiceOver says "Turn the iPad sideways". With Reduce Motion it shows the iPad sideways without moving. It disappears the moment the window is landscape, and the screen underneath keeps its state.

## Accessibility
- VoiceOver labels on all controls (helps parents and accessibility review).
- Reduce Motion is respected: celebrations become fades.
- Left-handed option (mirror the rails) in the Parents Area, Phase 7.
