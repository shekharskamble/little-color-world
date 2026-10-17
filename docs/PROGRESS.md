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
- Landscape lock: Expo Go ignores the app's orientation. This needs a development build (`npx expo run:ios`), which needs more free disk.
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
