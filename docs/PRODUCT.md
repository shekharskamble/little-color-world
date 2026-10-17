# Little Color World — Product Definition

## One-line pitch
A calm, premium, offline-first coloring and creative activity app for children aged 2–5, sold as a one-time US$0.99 purchase with no ads, accounts, tracking, or in-app purchases.

## Audience
| Group | Needs |
|---|---|
| Children 2–3 | Very large regions, tap-to-fill, no reading, forgiving touch, instant feedback, no failure states. |
| Children 4–5 | Richer fills (gradients, patterns, textures), tracing letters/numbers/shapes, free drawing, sticker collecting. |
| Parents | Trust: no ads, no data collection, no surprise network use, no purchases. Settings behind a parental gate. |

## Platforms
- **v1:** iPadOS, landscape only, full screen (no Split View).
- **Later:** iPhone (landscape), Android tablets.

## Business model
- Paid upfront, US$0.99 initially.
- No advertising, subscriptions, IAP, accounts, social features, or third-party analytics.
- New content ships as free downloadable packs (data + artwork only) or via App Store updates.

## Core activities
1. **Tap to Color:** tap a region to fill it with the selected solid color, gradient, pattern, or texture.
2. **Trace and Color:** follow guided paths for letters, numbers, shapes, and simple drawings, then color the result.
3. **Free Drawing:** finger drawing with brushes, crayon effects, sizes, stroke eraser, and undo/redo.
4. **My Creations:** gallery of saved and in-progress artwork.
5. **Stickers:** gentle, non-competitive rewards collected in a personal album.

## Non-goals (explicit)
- Leaderboards, daily streaks, timers, forced progression, loot-box-style rewards.
- Runtime AI generation. AI is used only during content creation, by the developer.
- Cloud sync, accounts, multi-device profiles (v1).
- Executable remote code (no OTA JavaScript updates).

## Success criteria for v1 release
- At least 60 curated pages across 6 or more themes, all validated by the pipeline.
- Every installed activity works in airplane mode.
- Zero network requests unless someone explicitly opens New Pictures and checks for updates.
- Apple Kids Category approved with the “Data Not Collected” privacy label.
- Tap-to-fill responds in under 100 ms (one or two frames) on the lowest supported iPad.

## Open product decisions
See [ROADMAP.md](ROADMAP.md#open-decisions).
