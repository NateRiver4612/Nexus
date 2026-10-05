# Nexus

## Project overview

Nexus is an AI-powered personal workspace organized around projects. The project is the unit of work: it holds knowledge, planning, conversations, artifacts, and activity. AI is a shared capability, not a separate destination — it understands context, reasons over it, and **suggests** actions. The **user approves**, then Nexus **executes** through its normal service/validation layer. Artifacts are the persistent outputs; conversations are temporary.

### Canonical stack

- **Runtime / tooling:** Bun + Turborepo (Bun workspaces), TypeScript.
- **API:** Hono (apps/api), typed end-to-end via `AppType` from `@nexus/api/client` consumed by `hc` in the web app.
- **Database:** PostgreSQL with **Drizzle ORM** + **pgvector** for embeddings.
- **Auth:** Better Auth (sessions/accounts/verifications live in `packages/db/src/schema/users.ts`).
- **Async:** Redis + BullMQ (queues in `apps/api/src/queues.ts`, workers in `workers.ts`).
- **Frontend:** Next.js 15 App Router, React 19, Tailwind CSS v4 (theme tokens in `apps/web/app/globals.css`), TanStack Query, hono-client RPC.
- **UI primitives:** shadcn-style components live in `@nexus/ui` (kebab-case files) and are re-exported from its index.

### Repo layout

- `apps/api` — Hono modular monolith: domain modules under `src/modules/*`, infra (db/redis/queues/workers) in `src`.
- `apps/web` — Next.js app: `app/` routes, `components/shell/` (app shell), `features/<domain>/`, `api/` (typed request wrappers), `hooks/` (TanStack Query), `lib/`.
- `packages/db` — Drizzle schema (one file per domain under `src/schema/`) + seed + migrations (`drizzle/`).
- `packages/zod-schemas` — shared zod-openapi schemas (single source for API I/O + web types).
- `packages/types` — `z.infer` types derived from `@nexus/zod-schemas`. Every exported type ends in `Type` (e.g. `ProjectType`, `KnowledgeSourceType`, `CreateProjectInputType`) so DTO types never collide with `@nexus/db` row types (`Project`, `KnowledgeSource`).
- `packages/ui` — shadcn primitives (`button`, `card`, `input`, `tabs`, `badge`, `avatar`, `progress`, `separator`, `skeleton`, …).
- `packages/config` — shared tsconfig / oxlint / prettier config.

### Domain modules

workspaces + workspace_members → projects + project_members → planner (**milestones** + **tasks** + **project_progress** resume-working) · knowledge (**knowledge_collections** + **knowledge_sources** + **knowledge_source_chunks** + vector embeddings; notebook-style multi-source ingestion of files/links/YouTube/copied-text) · artifacts (+ **artifact_versions**, files in S3/MinIO) · calendar (workspace-scoped events, optionally project-scoped) · notifications · activities · conversations + messages · ai (**ai_suggestions** + **ai_runs**) · search.

### Knowledge source ingestion (NotebookLM-style)

See `docs/knowledge-sources.md`. Sources are project-scoped rows in
`knowledge_sources` (`sourceType` enum, optional `sourceRef`, nullable
`storageKey`); chunks live in `knowledge_source_chunks` with pgvector embeddings
(hnsw cosine index).

- **Pipeline:** `POST /api/v1/knowledge/:projectId/sources` → insert source(s)
  (status `pending`) → enqueue BullMQ job `knowledge-process` (`jobId = ingest-${sourceId}`) →
  worker: extract (dispatch by `sourceType`) → chunk (~500–1000 token, ~10% overlap) →
  embed (OpenAI `text-embedding-3-small`, 1536 dims) → store `knowledge_source_chunks` →
  `ready`/`failed` → publish status to Redis pub/sub → SSE.
- **Request shape:** the create-sources payload is a `sourceType`-discriminated union
  (`file`/`url`/`youtube`/`copied_text`) — there is no `kind`/`linkType` grouping; the API
  map is 1:1 with the DB enum.
- **Dedup:** `jobId` keyed on the source so re-upload/re-submit doesn't double-process.
- **Source types:** `file` (pdf-parse/mammoth/xlsx/tesseract.js), `url`
  (readability+jsdom), `youtube` (`youtube-transcript` captions), `copied_text`.
  `audio`/`video` are **reserved but deferred** (ffmpeg + Whisper, later pass).
- **Embeddings env:** `OPENAI_API_KEY`, `AI_EMBEDDING_MODEL=text-embedding-3-small`.
- **File uploads:** MinIO + presigned PUT; S3-compatible storage module in
  `apps/api/src/storage`.

### AI principles (see `docs/ai-architecture.md`)

- Context-first: build per-request context, never dump the workspace into a prompt.
- Structured output: `LLM → Zod schema → application logic`. Never `LLM → database`, never `LLM → application state`.
- Provider abstraction: choose models by workload (cheap vs strong reasoning), providers swappable.
- Human-in-the-loop: simple ops hit the provider directly; complex workflows use LangGraph; long-running jobs run under BullMQ workers; mutations require user approval.

### Current-state caveat

The **docs and the DB schema are the reference model**. The API/zod-schemas layer is simplified, in-progress scaffolding that lags the DB — e.g. `planner_item` zod schema vs DB `milestones`/`tasks`, artifact `kind` vs `type`+versions, knowledge `title/body` vs collections+knowledge_sources, projects lacking `workspaceId`/`readme`/`startDate`/`targetDate`. Handlers in `apps/api` are stub placeholder implementations (no DB wiring yet). When implementing a domain, follow the DB schema/database-schemas doc, not the existing zod-schemas placeholders.

### Reference docs

The product/architecture docs live in `docs/` and are the source of truth for intent:

- `docs/product-blueprint.md`, `docs/product-identity.md`
- `docs/ai-architecture.md`, `docs/backend-architecture.md`, `docs/system-design.md`
- `docs/database-schemas.md`, `docs/frontend-architecture.md`, `docs/tech-stack.md`
- `docs/development-plan.md`, `docs/knowledge-sources.md`

## Development workflow

- Work incrementally: implement one logical step, verify it, then stop. Do not execute a feature end-to-end in a single pass unless explicitly asked.
- Understand before implementing: read the relevant code, identify what is known vs. unknown, and surface assumptions before writing code.
- Break large tasks into small steps (data model → API → validation → frontend) and validate each step before continuing.
- Ask before deciding when there are multiple reasonable approaches, or when the change affects the database schema, public API contracts, auth, dependencies, or existing architecture decisions.
- Validate a step (report what changed and what was verified), then stop and wait. Do not auto-continue to the next phase or do unrelated improvements.
- Minimize assumptions: do not silently invent fields, endpoints, UI behavior, auth rules, error semantics, or naming. Follow existing conventions for trivial choices.
- No code for code's sake: only add abstractions, "fancy" patterns, or refactors that solve a concrete, stated problem. Before proposing one, explain the problem it fixes; if it's not strictly necessary, leave the code as-is and say so. Prefer the smallest change that satisfies the requirement.
- Inspect existing code before creating new abstractions: reuse existing schemas, types, utilities, and route patterns rather than adding new ones.
- Keep changes small enough to review easily (1-3 files per step).
- Never commit without approval: draft the commit message, show it to the user, and wait for the go-ahead before staging and committing.

## File naming

- UI primitives follow the shadcn convention: kebab-case filenames (`button.tsx`, `badge.tsx`, `tabs.tsx`).
- Feature and app-shell components are PascalCase (`ProjectCard.tsx`, `Sidebar.tsx`, `AppShell.tsx`).

## Routing rules

- Do not separate code when it does not need to be shared.
- Route files are self-contained: keep params, request/response schemas, and error responses written inline where they are used inside `createRoute`. Do not extract them into module-level `const`s or a `shared.ts` unless they are genuinely reused across different modules.
- Handlers build their response object inline; do not extract placeholder/response helpers.
- Only separate code into a shared location when it is reused in more than one place.
- Name id fields for their entity, never a generic `ids`: use `projectId`, `deliverableIds`, `sourceId`, `milestoneId`, etc. (applies to schemas, request payloads, and variables).
- **User-facing copy:** API route `description` fields and any error/notification message surfaced in the app are user-facing. Write them as plain, human-readable English (e.g. `'Conversation created'`, `'Project not found'`) — never internal type/tech names (e.g. `'ConversationType created'`) or `Type`-suffixed identifiers. Automated refactors (type renames, renames) must not rewrite these strings.
