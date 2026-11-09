---
name: code-review
description: Use when asked to review code, a diff, a branch, or a PR in this repo (apps/api, apps/web, packages/*). Reports findings only; does not edit or commit.
---

Review against the Nexus rules in `AGENTS.md`, `apps/api/AGENTS.md`, `apps/web/AGENTS.md`, and the `ai-principles`, `api-routing`, `knowledge-ingestion` skills. Don't restate those here; check the change against them. The `docs/*.md` files and `packages/db` schema are the reference model.

## Scope

1. Determine what to review: the user's target if given, otherwise `git diff <base>...HEAD` plus `git diff` and `git diff --cached`. Base is `develop` unless told otherwise.
2. Read each changed file in full, plus the neighbours it depends on (the service behind a route, the repository behind a service, the hook behind a component). A diff alone hides most real bugs.
3. Review only what changed. Pre-existing problems are mentioned only when the change makes them worse or depends on them.

## Do not flag

- `@nexus/zod-schemas` placeholders lagging the DB schema. The DB schema wins; flag code that follows the placeholder over the schema.
- Stub handlers (e.g. `handler: (c) => c.json([], 200)`) in modules that haven't been implemented yet, unless the change claims to implement them.
- Generated files: `apps/api/drizzle/*.sql`, `drizzle/meta/*`, `bun.lock`. Review the schema change that produced them instead.
- Formatting and import order. Prettier and oxlint own those.

## What to check, in priority order

### 1. Authorization and data isolation (highest severity)

- `requireAuth` only proves who the caller is. Every route that takes a `projectId`, `taskId`, `conversationId`, `sourceId` or similar must also prove the caller may touch that resource: `requireProjectAccess`, `requireTaskAccess`, or an ownership/membership check in the service.
- Access middleware is attached either router-wide in `routes/index.ts` or per route via `middleware: [...]` inside `createRoute`. Confirm the new route is actually covered by one of them. Defining the middleware is not enough.
- Not-found and not-authorized return the same 404 (`NotFoundError`), as the existing middlewares do. Flag any 403 that leaks that a resource exists.
- Child resources (notes, steps, chunks, suggestions) must be checked against their parent, not just looked up by id.
- Queries over soft-deleted tables (e.g. `projects.deletedAt`) must filter `isNull(deletedAt)`.
- Never trust a `projectId`/`userId` from the request body when the path or session already supplies it.

### 2. Correctness and data integrity

- Multi-statement writes belong in `db.transaction` with the `tx`-scoped repository/service, not the pooled `db`.
- BullMQ jobs stay idempotent: stable `jobId` (e.g. `ingest-${sourceId}`), status transitions `pending → processing → ready/failed`, and failure paths that actually mark `failed` and publish the status event. No swallowed errors in workers; unknown job names throw.
- Retries are bounded (`attempts`/backoff). Nothing may loop on a persistently invalid LLM response.
- Unchecked non-null assertions (`rows[0]!`, `c.req.param('x')!`) are only acceptable right after a write that guarantees the row or in middleware that runs before the handler. Otherwise use `ensureExists`.
- Drizzle: schema changes come with a generated migration (`db:generate`), never a hand-edited SQL file. Schema, public API, auth, and dependency changes were supposed to be approved first, so call them out explicitly in the review.
- Embeddings stay 1536 dims behind `ai/embeddings.ts`.

### 3. AI rules

- Every model call goes through `AIProvider` / `modelForTask()`. A provider SDK client instantiated inside a domain module is a finding.
- LLM output reaches the DB or app state only through a Zod validation gate. No `JSON.parse` of model text straight into a write.
- AI never mutates on its own. Chat tools are read-only. Writes go through a stored suggestion plus an explicit approval endpoint.
- No whole-workspace prompt dumps. Context is built per request from the relevant project/task/knowledge data.
- LangGraph is only for genuinely model-decided branching. A fixed multi-step sequence should be plain code in a BullMQ worker.

### 4. API structure (`apps/api`)

- Layering: route → service → repository. Routes never touch the repository or `Db` directly. Repositories take `Db | PgTransaction` and never call `getDb()`. Services throw `HttpError` through the factories in `errors.ts` and map rows to `@nexus/types` DTOs.
- Route files are self-contained: params, schemas and error responses inline in `createRoute`, no premature `shared.ts`. `as const` on the `openapiRoutes([...])` array. No per-route `security: bearerSecurity`.
- Id fields are named for their entity (`projectId`, `milestoneIds`), never `id`/`ids` in payloads, schemas or variables.
- User-facing strings (route `description`, error messages) are plain English with no `Type`-suffixed or internal names.
- No secrets in code. Config comes from `process.env`, and `DATABASE_URL` has no fallback.
- `console.log` of user content, tokens, or full prompts is a finding. Errors go through `handleHttpError`.

### 5. Web structure (`apps/web`)

- Data flow is component → `hooks/useX.ts` → `api/x.ts` → `apiClient` + `handleResponse`. Components never call `fetch` or `apiClient` directly.
- Query keys come from `hooks/queryKeys.ts`. Mutations invalidate the affected keys. Single-argument hooks use the `createQueryHook` / `createDetailQueryHook` / `createMutationHook` factories. List hooks are named `getX` / `useGetX`.
- Server components by default. `'use client'` only when hooks, state, router or Radix primitives need it.
- No `File` objects in request payloads. Upload via presigned PUT, then send metadata gated by the Zod schema.
- Persisted drafts are scoped by `shouldDehydrateQuery` and gated with `useIsRestoring()`.
- Forms use `FormInput` / `FormTextArea`. Colors use theme tokens (`bg-background`, `text-muted-foreground`), not raw hex. Primitives come from the shared UI package, not re-implemented.
- Effects with subscriptions or SSE (`lib/Sse.ts`) clean up on unmount. Query/effect dependency arrays are complete.

### 6. Code style (cheap but mandatory)

- Destructured-object params, never positional.
- `type`, never `interface`.
- Components are `const Foo = () => {}`, never `function Foo()`. Plain `function` is fine for non-components.
- Named React imports only. No `React.` namespace and no `import * as React`.
- File names: kebab-case for UI primitives, PascalCase for feature/shell components.
- No index barrels. Import from the owning file.

### 7. Scope discipline

- Flag new abstractions, helpers, or refactors that don't solve a concrete stated problem. "Might be reused later" doesn't count.
- Flag invented fields, endpoints, or behavior not backed by the schema or `docs/*.md`.
- Flag reimplementations of existing schemas, types, or utilities.
- A change that spans far more than a few files, or mixes unrelated concerns, should be noted so it can be split.

### 8. Tests

- New behavior in AI providers, workers, or services has a test, or the review says what is untested. Provider tests live under `modules/ai/__tests__`. Live-API tests must not run by default.
- Error and retry paths are covered, not just the happy path.

### 9. Best practices (simple, rational, senior-style)

- **Simplest solution that solves the actual problem.** No speculative abstraction, config, or indirection. "Might be reused later" is not a reason.
- **Simple, not naive.** Simplicity still handles the real edge cases, errors, and boundaries — don't trade correctness or robustness for brevity.
- **Senior judgment.** Explicit over implicit, predictable control flow, narrow scope, fail fast, clear names. If a reviewer would ask "why not just X?", propose X. Prefer boring, readable code over clever one-liners.
- **Question the premise.** If the change isn't needed, or a smaller change gets the same result, say so.
- **Current idioms.** Flag stale or deprecated APIs/patterns and suggest the modern approach — as a suggestion with the recommended version or idiom and a one-line why. Never upgrade, edit `package.json`, or relock; the user approves.
- **Don't rewrite working code over preference.** A style opinion with no correctness or maintenance cost is a nit at most.

## Output

Lead with a one-line verdict: `approve`, `approve with nits`, or `changes requested`.

Then list findings grouped by severity: **Blocker** (security, data loss, broken behavior), **Should fix** (rule violations, missing validation, missing tests), **Nit** (style), **Suggestion** (modernization, simplification, senior alternative — optional). For each finding give:

- `path:line`
- what is wrong, in one or two sentences
- the fix, only when it isn't obvious

Be specific and cite code. Don't pad with praise or restate the diff. If a category has nothing to report, omit it.

End with a short **Verified** line saying what you actually read or ran (files, `tsc`, lint, tests), and **Not verified** for anything you couldn't check.

Then stop. Do not edit files, apply fixes, run `git add`, or commit unless the user explicitly asks. If several reasonable fixes exist or a fix touches schema, public API, auth, or dependencies, ask first.
