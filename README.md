# HealthView OS

HealthView OS is a visual operating system for personal health.

The goal is to make health data explorable in the way a modern vehicle UI makes a complex machine understandable: clear status, spatial context, warning signs, trends, and actionable insights.

## Direction

- Visual-first personal health dashboard
- TypeScript pnpm monorepo
- Modular apps and packages for fast hackathon iteration
- Designed for local-first development, with room for cloud deployment
- Evidence-backed insights with traceable source provenance

## Repository Layout

```text
apps/
  web/        # Primary browser HealthView OS experience
  desktop/    # Tauri desktop shell that embeds the web UI with native local vault services
  mobile/     # Expo Router native mobile MVP
packages/
  app-model/  # Shared destinations, categories, labels, and icon keys
  app-state/  # Shared vanilla Zustand app state and control command helpers
  design/     # Shared design tokens
  schema/     # Shared source, evidence, provenance, and record contracts
  workspace/  # Shared workspace client contracts, selectors, and view models
```

## Product Policies

- [Privacy and data handling](./PRIVACY.md)
- [Data model](./DATA.md)
- [Data sources](./SOURCES.md)
- [Canonical health model](./MODEL.md)

## Getting Started

```bash
pnpm install
pnpm dev:web
pnpm dev:tauri
pnpm dev:mobile
```

Useful build and verification commands:

```bash
pnpm typecheck
pnpm test
pnpm --filter @healthviewos/web build
pnpm --filter @healthviewos/desktop build
pnpm --filter @healthviewos/desktop build:tauri
pnpm --filter @healthviewos/mobile typecheck
pnpm --filter @healthviewos/mobile lint
```
