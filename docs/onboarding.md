# Onboarding

A project is created through a **5-step onboarding wizard**, then an **AI kickoff**
run generates the first plan. This doc is the reference for the flow, its data
model, and the `level` input that scopes the generated plan.

## Steps

| #   | Step                | Captures                          | Notes                                                                    |
| --- | ------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| 1   | Basics              | `name`, `description`, `category` | Creates the draft project + `project_onboarding` row.                    |
| 2   | Goal                | `context` (the goal), `level`     | `level` is **required** — it scopes the plan (see below).                |
| 3   | Context & resources | knowledge sources                 | Files / links / YouTube / copied text — see `docs/knowledge-sources.md`. |
| 4   | Deliverables        | preset + custom deliverables      | Attached to the project via the assignment table.                        |
| 5   | Review & generate   | —                                 | Fires the kickoff AI run on entry; the plan is reviewed, then committed. |

Each step persists its payload into `project_onboarding.step_data` (jsonb). The
per-step shape is the matching `onboardingStepN` schema in `@nexus/zod-schemas`;
`@nexus/types` derives `OnboardingStepNInputType` from it.

## Level

Chosen in step 2, `level` is a required enum (`beginner | intermediate | advanced`)
that scopes how much of the arc the generated plan covers. It's applied through
`LEVEL_GUIDANCE` in `apps/api/src/modules/kickoff/prompt.ts`:

- **beginner** — a small, contained plan covering the fundamentals and producing
  something basic but complete. Lightest of the three.
- **intermediate** — fundamentals handled briefly, with the bulk of milestones,
  tasks, and depth in the real build.
- **advanced** — the full arc (fundamentals → intermediate → advanced) as one
  project, weighted heavily toward the advanced end; the largest, most demanding plan.

## Data model

- `project_onboarding` — `status` (`in_progress | submitted | completed`), `step`,
  `ai_run` (FK to `ai_runs`), `step_data` (jsonb), `completed_at`.
- `deliverables` — shared catalog (system presets have `project_id = null`; custom
  rows carry the owning `project_id`).
- `deliverables_projects_assignment` — many-to-many link; a project's _selected_
  deliverables are read by joining through this table.

## AI kickoff flow

```
Submit (step 5, fires on entry)
  → insert ai_runs row (status queued), set project_onboarding.ai_run, enqueue "kickoff" job (jobId = run id)
  → worker: build context → generate_project_plan tool call → validate with kickoffPlanSchema
  → store the plan on ai_runs.data, status completed | failed

Preview page (polls the run via project_onboarding.ai_run):

  ├─ status: completed → show plan
  │     ├─ Complete → commit (milestones + tasks + deliverables assignment,
  │     │              project_onboarding.status = completed, project.status = active,
  │     │              seed project_progress) — final, no going back past this point
  │     └─ Back → return to an earlier step, edit, resubmit from step 5
  │                → new ai_runs row + job, project_onboarding.ai_run repointed to it
  │
  └─ status: failed → show error state
        ├─ Back → edit inputs, resubmit (as above)
        └─ Regenerate → retry with unchanged step_data
                        → new ai_runs row + job, project_onboarding.ai_run repointed to it
```

See `docs/ai-architecture.md` §11 for the AI workflow principles (single forced
tool-calling request, Zod validation, human-in-the-loop draft/approve boundary).

## Regenerate & failure handling

Both "Back" and "Regenerate" produce a fresh `ai_runs` row and a fresh job —
there's no in-place retry of a run. `project_onboarding.ai_run` always points
at the most recent run; earlier runs remain in `ai_runs` as history but are
no longer referenced by the onboarding record.

- **Back** — available on both `completed` and `failed` states. Returns the
  user to an earlier step to edit `step_data`, then resubmits from step 5.
  This is the only path forward from a completed plan the user doesn't want
  as-is — there is no plain retry-with-same-inputs once generation succeeds.
- **Regenerate** — available only on `failed` state. Resubmits the current
  `step_data` unchanged, for another attempt without changing anything.

Once a run reaches `completed` and the user hits **Complete**, the commit is
final — there is no un-committing. Reviewing happens before Complete, not
after.

## Validation

- **Client (per step):** each step exposes `save()` (via `StepHandle`); it runs the
  step's zod resolver / explicit checks and returns `false` when invalid, so
  `Onboarding.handleNext` won't advance. Resuming with already-valid saved data
  skips a redundant re-save.
- **Server:** `saveOnboarding` validates each step against its `onboardingStepN`
  schema; `requireCompleteOnboarding` / `requireOnboardingForProject` middlewares
  enforce that the required steps exist before submit/complete.

## Surfaces

- **API:** `apps/api/src/modules/projects/routes` — `getOnboarding`, `saveOnboarding`,
  `submitOnboarding`, `completeOnboarding`, and the project-scoped deliverable routes.
- **Web:** `apps/web/components/onboarding/` (`Step1`–`Step5`, `Onboarding.tsx`) and the
  `new-project/preview` page.
