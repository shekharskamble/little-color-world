# CLAUDE.md: Little Color World

Premium, offline-first coloring app for ages 2–5. iPad-first, landscape, paid upfront, no ads/IAP/accounts/tracking.

## Source of truth
Read before non-trivial work, and update when requirements, architecture, or status change:
- docs/PRODUCT.md: what we are building and explicit non-goals
- docs/ARCHITECTURE.md: layering, data models, key decisions
- docs/UX.md: toddler UX rules, layout, tokens
- docs/ROADMAP.md: phases, milestones, **open decisions**
- docs/ARTWORK_PIPELINE.md, docs/CONTENT_DELIVERY.md
- docs/PROGRESS.md: append an entry after every milestone (what changed, how it was verified, what is next)

## Commands
- `npm run typecheck`, `npm run lint`, `npm test`: run all three after every change
- `npx expo start --port 8082`: dev server (8081 is often used by another local project); `i` for the iOS simulator (choose an iPad)
- `npx expo install <pkg>`: **always** use this for native packages; then `npm run doctor`
- Expo changes every SDK. Check installed `.d.ts` files or https://docs.expo.dev/versions/v58.0.0/ before using an API from memory. Known gotchas: docs/ARCHITECTURE.md §13.

## Hard rules
- TypeScript strict. No `any` without a comment explaining why.
- `src/engine/**` and `src/content/schema/**` are pure TS: no imports from react, react-native, expo-*, or @shopify/react-native-skia.
- No new dependency without a stated reason. Never add analytics, ads, crash reporting, Firebase/Supabase, expo-updates, or auth.
- Network access only in `src/features/content-updates`, only after an explicit tap in New Pictures (not parent-gated, decision D7), HTTPS + host allowlist + size limits. Never automatic or in the background.
- Remote content is data only. Never eval, download JS, or download shaders.
- Outlines always render above fills. Fills are drawn as region paths with a shader, not as clip stacks.
- Undo history stores commands, never bitmaps.
- Do not substitute placeholder behavior for required behavior silently. If something is stubbed, say so in PROGRESS.md and in the UI for developers.
- Ask before destructive operations (deleting files or data, rewriting git history, removing caches).
- No recurring costs without the owner's approval.
- Do not claim something works without a test or a described manual verification.

## Layout
`src/app` routes (thin) · `src/features/<name>` feature UI + hooks · `src/ui` design system · `src/render` Skia adapters · `src/engine` pure logic · `src/content` schema + registry · `src/persistence` SQLite · `content/` bundled page JSON.

## Conventions
- Small components; feature folders under `src/features/<name>`.
- Region IDs: `^[a-z][a-z0-9_-]*$`, stable across content versions.
- Tests live next to code as `*.test.ts`. Persistence tests use `src/test-utils/nodeSqlite.ts` with `/** @jest-environment node */`.
- Avoid file names that differ only by case (macOS is case-insensitive).
