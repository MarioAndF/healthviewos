# HealthView OS

HealthView OS is a visual operating system for personal health.

The goal is to make health data explorable in the way a modern vehicle UI makes a complex machine understandable: clear status, spatial context, warning signs, trends, and actionable insights.

## Direction

- Visual-first personal health dashboard
- TypeScript pnpm monorepo
- Modular apps and packages for fast hackathon iteration
- Designed for local-first development, with room for cloud deployment

## Repository Layout

```text
apps/
  web/        # Primary HealthView OS experience
packages/
  ui/         # Shared interface components
  core/       # Shared domain logic and types
```

## Getting Started

```bash
pnpm install
pnpm dev
```

The current prototype lives in `apps/web`.
