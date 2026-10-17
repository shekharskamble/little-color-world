# Little Color World

A calm, offline-first coloring and creative activity app for children aged 2–5. iPad first. One-time purchase, no ads, no accounts, no tracking.

> **Status:** Phase 0 + Phase 1 implemented (one dinosaur page). See [docs/PROGRESS.md](docs/PROGRESS.md).

## Requirements
- macOS with Xcode 26+ and an iPad simulator
- Node 20.19+ (developed on 24.x), npm
- Watchman (recommended)
- At least 30 GB free disk for iOS native builds

## Getting started
```bash
npm install
npx expo start        # press i, pick an iPad simulator (Expo Go)
npm run typecheck && npm run lint && npm test
```

## Documentation
| Doc | Purpose |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Product definition and non-goals |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data models, decisions |
| [docs/UX.md](docs/UX.md) | Child UX rules, layouts, design tokens |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases, milestones, open decisions |
| [docs/ARTWORK_PIPELINE.md](docs/ARTWORK_PIPELINE.md) | Creating and validating coloring pages |
| [docs/CONTENT_DELIVERY.md](docs/CONTENT_DELIVERY.md) | Remote content packs |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Progress log |
| [CLAUDE.md](CLAUDE.md) | Rules for AI-assisted development |

## Privacy
The app collects no data. It makes no network requests unless a parent explicitly checks for new pictures in the Parents Area.
