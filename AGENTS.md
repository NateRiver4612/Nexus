# Nexus

Nexus is an AI-powered personal workspace organized around projects — the unit of work holding knowledge, planning, conversations, artifacts, and activity. AI suggests, Nexus executes through its normal service/validation layer after user approval. Artifacts persist; conversations are temporary.

## Stack

Bun + Turborepo, TypeScript. Hono API (`apps/api`, typed end-to-end via `AppType`). Drizzle ORM + pgvector. Better Auth. Redis + BullMQ. Next.js 15 + React 19 + Tailwind v4 + TanStack Query. shadcn primitives in `@nexus/ui`.

## Repo layout

- `apps/api` — Hono modular monolith: `src/modules/*` (domains), infra (db/redis/queues/workers) in `src`
- `apps/web` — Next.js: `app/` routes, `components/shell/`, `features/<domain>/`, `hooks/`
- `packages/db` — Drizzle schema (`src/schema/*`), migrations in `drizzle/`
- `packages/zod-schemas` — shared API I/O schemas
- `packages/types` — `z.infer` types, suffixed `Type` (e.g. `ProjectType`) so they never collide with `@nexus/db` row types
- `packages/ui` — shadcn primitives

## Current-state caveat

`docs/` and the DB schema in `packages/db` are the reference model. The API/zod-schemas layer is in-progress scaffolding that lags behind — when implementing a domain, follow the DB schema and the relevant `docs/*.md`, not the existing zod-schemas placeholders.

## Development workflow

- Work incrementally: one logical step, verify, then stop. No end-to-end passes unless explicitly asked.
- Understand before implementing: read the relevant code, surface assumptions before writing any.
- Ask before deciding when multiple reasonable approaches exist, or the change touches schema, public API, auth, deps, or architecture.
- Report what changed and what was verified, then stop — don't auto-continue to the next phase.
- Minimize assumptions: never silently invent fields, endpoints, behavior, or naming.
- No code for code's sake: justify any new abstraction/refactor against a concrete stated problem, or leave it as-is.
- Reuse existing schemas/types/utilities before creating new ones.
- Keep changes to 1-3 files per step.
- Never commit without approval — draft the message, show it, wait for the go-ahead.

## File naming

- UI primitives: kebab-case (`button.tsx`)
- Feature/app-shell components: PascalCase (`ProjectCard.tsx`)

## Code style

- Params: destructured object (`({ id, status }: Params) => ...`), never positional (`(id, status) => ...`).
- Types: `type`, never `interface`.
- Components: `const Foo = () => {}`, never `function Foo() {}`. Keep `function` for actual (non-component) functions — this rule is components-only.

```typescript
// ✅
type TaskCardProps = { title: string; status: TaskStatus };

const TaskCard = ({ title, status }: TaskCardProps) => {
  return <div>{title}</div>;
};

// ❌
interface TaskCardProps {
  title: string;
  status: TaskStatus;
}

function TaskCard(title: string, status: TaskStatus) {
  return <div>{title}</div>;
}
```

## Agent tool/script output

If writing a custom script or skill whose output is read back by the agent itself (not by the app) — a dev-tooling helper, a skill's bash script — prefer [TOON] (https://toonformat.dev) format over JSON (`name[count]{fields}:` header + comma rows); ~40% fewer tokens for the same information, per the [AXI](https://axi.md) principles. `git status --short`'s terse style is the same idea in spirit. This does **not** apply to Nexus's own API responses — those stay structured JSON per the zod-schemas contract; this rule is agent-tooling only.

## Reference docs

`docs/product-blueprint.md`, `product-identity.md`, `ai-architecture.md`, `backend-architecture.md`, `system-design.md`, `database-schemas.md`, `frontend-architecture.md`, `tech-stack.md`, `development-plan.md`, `knowledge-sources.md`
