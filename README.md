# Nexus

A modular monolith for project planning and collaboration.

## Architecture

```
apps/
  web/     Next.js frontend (App Router)
  api/     Hono modular monolith (vertical-slice modules) + drizzle config, migrations, seed, .env
packages/
  db/      Drizzle schema (schema-only)
  ui/      shadcn/ui components
  types/   Shared zod contracts + typed API client
  config/  Shared tsconfig, lint, and formatter config
docker-compose.yml   Local services (Postgres, Redis, MinIO) — reads apps/api/.env
```

## Quick start

```sh
bun install
cp apps/api/.env.example apps/api/.env
docker compose --env-file apps/api/.env up -d
bun run db:migrate
bun run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Health check: http://localhost:3001/health

## Domain modules

The API is a modular monolith. Each feature is a vertical slice under `apps/api/src/modules/<module>/`:

```
routes.ts      → HTTP wiring + validation (Hono)
service.ts     → application/business logic
repository.ts  → data access (Drizzle)
schemas.ts     → zod schemas (shared with packages/types)
```

Modules: `projects`, `planner`, `artifacts`, `knowledge`, `notifications`, `search`, `users`.

## Tooling

- oxlint (lint) · prettier (format) · turborepo (task orchestration)
- Root scripts: `bun run dev|build|lint|format:check|typecheck`
