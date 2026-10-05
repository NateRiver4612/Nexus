# apps/api

Hono modular monolith. Domain modules live in `src/modules/*`; infrastructure clients (db/redis/queues/workers) sit in `src`.

## Wiring

- `src/app.ts` — `createApp()` builds the app: `new OpenAPIHono()`, global logging/cors/error handling, `/doc` + `/docs` (Swagger), better-auth at `/api/auth/*`, `/health`, then mounts modules as a chained `v1` router: `.route('/<module>', <module>Routes())`.
- `src/index.ts` — Bun bootstrap: `startWorkers()`, `Bun.serve({ port: Number(process.env.PORT ?? 3001), fetch: createApp().fetch })`, then a Redis ping.
- `src/client.ts` — `export type AppType = ReturnType<typeof createApp>`; consumed by the web app via `@nexus/api/client`.

## Module pattern

Each domain is `src/modules/<domain>/routes/`:

- One file per endpoint exporting `defineOpenAPIRoute({ route: createRoute({...}), handler })`.
- `createRoute` is self-contained: method, path, `security: bearerSecurity`, params/body/query schemas, and responses (200/201/401/404 with `errorResponseSchema`) are written **inline** — do not extract a `shared.ts` unless genuinely reused.
- `routes/index.ts` does `const app = new OpenAPIHono(); app.use('*', requireAuth); return app.openapiRoutes([...] as const);` — `as const` is required to preserve the schema types.
- Handlers are stubs (no DB yet): build the response object **inline** and type-check it with `satisfies <Type>` from `@nexus/types`.

## Reference model

The **DB schema is the target** (`packages/db/src/schema/*`). `@nexus/zod-schemas` placeholders lag the DB (e.g. `planner_item` vs `milestones`+`tasks`). When implementing a domain, follow the DB schema — not the zod-schemas placeholders.

## Environment

- Root `.env` is the source; dev/start scripts run `bun --env-file=../../.env ...`. `packages/db/src/env.ts` also loads the root `.env` for DB/seed/drizzle tooling.
- Never hardcode secrets; read via `process.env` with sensible dev defaults.

## Infra files

- `src/db.ts` — `getDb()` re-export from `@nexus/db` (single pooled Postgres client).
- `src/redis.ts` — `getRedis()` ioredis client (`REDIS_URL`).
- `src/queues.ts` — `getQueue<T>(name)` BullMQ queue factory.
- `src/workers.ts` — `startWorkers()` BullMQ workers.
