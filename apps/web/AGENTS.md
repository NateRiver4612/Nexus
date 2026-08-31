# apps/web

Next.js 15 App Router app. `@/*` aliases to `apps/web/*`.

## Folder structure

- `app/` — routes only (thin page files). `(auth)/`, `(workspace)/`, `projects/[projectId]/…`.
- `components/shell/` — app shell: `Sidebar.tsx`, `Topbar.tsx`, `AppShell.tsx` (PascalCase, `'use client'`).
- `features/<domain>/` — feature components per domain (PascalCase, e.g. `features/projects/ProjectCard.tsx`, `ProjectsView.tsx`).
- `api/<domain>.ts` — typed request wrappers: call `apiClient.api.v1.*` (hono-client RPC) and unwrap via `handleResponse` from `@/lib/client`. No `api/index.ts` barrel.
- `hooks/` — TanStack Query hooks that call `api/` functions, grouped **one file per domain** (`useProjects.ts` holds `useGetProjects`, `useProject`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`; `useAi.ts` holds all AI hooks), plus `queryKeys.ts`. No `hooks/index.ts` barrel.
- `lib/` — `client.ts` (`hc<AppType>` + `handleResponse`), `utils.ts` (`cn`), `providers.tsx` (QueryClientProvider).

## Conventions

- Server components by default; add `'use client'` when using hooks, state, router, or Radix-backed primitives.
- Data fetching goes through `hooks/` (TanStack Query) → `api/` wrappers → `apiClient`.
- **No index barrels**: import directly from the file that owns the export (`import { getProjects } from '@/api/projects'`, `import { useGetProjects } from '@/hooks/useProjects'`).
- List-query hooks/request wrappers are named `getX` / `useGetX` (e.g. `getArtifacts`, `useGetArtifacts`).
- UI primitives come from `@nexus/ui` (shadcn-style, kebab-case); avoid re-implementing them.
- Feature and shell components are PascalCase (see root AGENTS.md "File naming").

## Theme

Semantic color tokens are defined with Tailwind v4 `@theme` in `app/globals.css` (`background`, `foreground`, `primary`/`primary-dark`, `secondary`, `muted`, `accent`, `error`, …). Use these utilities (`bg-background`, `text-muted-foreground`, `bg-primary`, …) rather than raw hex.
