# apps/web

Next.js 15 App Router app. `@/*` aliases to `apps/web/*`.

## Folder structure

- `app/` — routes only (thin page files). `(auth)/`, `(workspace)/`, `projects/[projectId]/…`.
- `components/shell/` — app shell: `Sidebar.tsx`, `Topbar.tsx`, `AppShell.tsx` (PascalCase, `'use client'`).
- `features/<domain>/` — feature components per domain (PascalCase, e.g. `features/projects/ProjectCard.tsx`, `ProjectsView.tsx`).
- `api/<domain>.ts` — typed request wrappers: call `apiClient.api.v1.*` (hono-client RPC) and unwrap via `handleResponse` from `@/lib/client`. No `api/index.ts` barrel.
- `hooks/` — TanStack Query hooks that call `api/` functions, grouped **one file per domain** (`useProjects.ts` holds `useGetProjects`, `useProject`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`; `useAi.ts` holds all AI hooks), plus `queryKeys.ts`. No `hooks/index.ts` barrel.
- `lib/` — `client.ts` (`hc<AppType>` + `handleResponse`), `utils.ts` (`cn`), `providers.tsx` (QueryClientProvider + `persistQueryClient`).

## Conventions

- Server components by default; add `'use client'` when using hooks, state, router, or Radix-backed primitives.
- Data fetching goes through `hooks/` (TanStack Query) → `api/` wrappers → `apiClient`.
- **No index barrels**: import directly from the file that owns the export (`import { getProjects } from '@/api/projects'`, `import { useGetProjects } from '@/hooks/useProjects'`).
- **State split**: server data → TanStack Query (`hooks/` → `api/` → `apiClient`); persisted client/UI draft state → `persistQueryClient` (`@tanstack/react-query-persist-client` + `createSyncStoragePersister` in `lib/providers.tsx`), **scoped** via `dehydrateOptions.shouldDehydrateQuery` to the draft's query key so it never serializes the whole cache. Drafts are **write-only persisted queries** (read via `useQuery` with `enabled: false` / `staleTime: Infinity`; written via functional `setQueryData`), keyed under the domain keys (e.g. `onboardingKeys.draft`). Gate restored-draft consumers on `useIsRestoring()`.
- List-query hooks/request wrappers are named `getX` / `useGetX` (e.g. `getArtifacts`, `useGetArtifacts`).
- **Controlled fields**: prefer the shared RHF wrappers `FormInput` / `FormTextArea` (Controller-based, self-registering — no manual `{...register}` wiring; they render label/description/error and set `aria-invalid`). Raw `<input>` is only for hidden native file inputs.
- **Upload boundary**: forms hold `File` objects (selection-validated with `fileSchema` — `z.instanceof(File)`); the wire payload is `createKnowledgeSource*Schema`-shaped metadata built _after_ a presigned PUT, transformed at the request boundary and gated with `createKnowledgeSourcesSchema.parse`/`safeParse` before `mutateAsync`. Never send a `File` itself.
- **React imports are named, never namespace access.** Import hooks and types directly from `'react'` (`import { useEffect, useState, useRef, useId } from 'react'`, `import type { ReactNode, ComponentProps, Ref, KeyboardEvent } from 'react'`). Do not use the `React.` namespace (`React.useEffect`, `React.ReactNode`, `React.ComponentProps<...>`) and do not `import * as React from 'react'`. Applies to every import from `'react'` (hooks, event/HTML types, `ReactNode`, etc.).
- UI primitives come from `@nexus/ui` (shadcn-style, kebab-case); avoid re-implementing them.
- Feature and shell components are PascalCase (see root AGENTS.md "File naming").

## Data-fetching hooks (factories)

`hooks/createQuery.ts` (`createQueryHook`, `createDetailQueryHook`) and `hooks/createMutation.ts` (`createMutationHook`)
generate typed TanStack hooks from a plain `api/` function, inferring `TData`/`TVariables` from the function
signature — no manual `UseQueryOptions<Awaited<ReturnType<typeof fn>>…>` needed.

- **Prefer the factories for single-argument hooks.** Examples:
  ```ts
  // Detail query — auto-disabled until the id is truthy.
  export const useGetProjectById = createDetailQueryHook(getProject, (id) =>
    projectKeys.detail(id),
  );

  // Mutation with a default cache-invalidation baseline.
  export const useCreateProject = createMutationHook(createProject, (queryClient) => ({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  }));
  ```
  Call-site options compose with (never silently override) factory defaults: mutations run default **and**
  caller callbacks (`onMutate`/`onError`/`onSuccess`/`onSettled`); query `enabled` is ANDed with any derived
  gate (`getEnabled`).
- `getQueryKey` is **required** — query keys are a deliberate cache-shape decision
  (`projectKeys.detail(id)`), not derivable from the function signature.
- **Zero/multi-argument fns keep the plain pattern**: `createQueryHook`/`createMutationHook` type their
  variables as the single first parameter. Zero-arg queries (`useGetProjects`, `useMe`) and multi-arg
  mutations (`useUpdateProject`, `useUpdateAiSuggestion`) stay as explicit `useQuery`/`useMutation`.
- Import the factories via `@/hooks/createQuery` / `@/hooks/createMutation`.
- No `hooks/index.ts` barrel — hooks stay grouped by domain file (`useProjects.ts`, `useAi.ts`, …).

## Theme

Semantic color tokens are defined with Tailwind v4 `@theme` in `app/globals.css` (`background`, `foreground`, `primary`/`primary-dark`, `secondary`, `muted`, `accent`, `error`, …). Use these utilities (`bg-background`, `text-muted-foreground`, `bg-primary`, …) rather than raw hex.
