import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';
import { projectSchema } from './projects';
import { userSchema } from './users';

export const milestoneStatusSchema = z.enum(['planned', 'active', 'completed']);
export const taskStatusSchema = z.enum([
  'todo',
  'in_progress',
  'completed',
  'cancelled',
  'paused',
  'reopen',
]);
export const taskDifficultySchema = z.enum(['low', 'medium', 'high']);
export const taskStepStatusSchema = z.enum(['todo', 'completed']);

/** A single step of a task — persisted row DTO. */
export const taskStepSchema = z
  .object({
    id: idSchema,
    taskId: idSchema,
    value: z
      .string()
      .max(150)
      .openapi({ example: 'Create the Postgres database' })
      .describe(
        'Name the exact command, API, file, or concept the user performs — concrete enough ' +
          'to act on without going back to the source material. Keep it to a single action, ' +
          'at most 150 characters.',
      ),
    position: z.number().int().default(0),
    status: taskStepStatusSchema.default('todo'),
    ...timestampSchema,
  })
  .openapi('TaskStep');

/** A task's definition-of-done item — persisted row DTO. */
export const taskDodSchema = z
  .object({
    id: idSchema,
    taskId: idSchema,
    value: z
      .string()
      .max(150)
      .openapi({ example: 'Migration runs cleanly from scratch' })
      .describe(
        'A concrete, verifiable acceptance criterion — an outcome or result the user can ' +
          'check, not an action: e.g. "migration runs cleanly from scratch" or "endpoint ' +
          'returns 200". Keep it to a single criterion, at most 150 characters.',
      ),
    position: z.number().int().default(0),
    status: taskStepStatusSchema.default('todo'),
    ...timestampSchema,
  })
  .openapi('TaskDod');

export const milestoneSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: z.string().min(20).max(100).openapi({ example: 'Foundation' }),
    description: z
      .string()
      .max(300)
      .nullable()
      .openapi({ example: 'Core setup' })
      .describe(
        'A specific description of this milestone: what gets built or accomplished, ' +
          'the key approach, and how it feeds the next phase — 1-3 sentences, never generic.',
      ),
    position: z.number().int().default(0),
    status: milestoneStatusSchema.default('planned'),
    ...timestampSchema,
  })
  .openapi('Milestone');

export const taskSchema = z
  .object({
    id: idSchema,
    title: z.string().min(20).max(100).openapi({ example: 'Set up Postgres' }),
    description: z
      .string()
      .max(200)
      .nullable()
      .openapi({ example: 'Provision the database' })
      .describe(
        'A specific description of this task: name the concrete outcome/deliverable, ' +
          'the key files/functions/approach involved, and why it matters — 1-3 sentences, ' +
          'never a generic phrase like "learn X" or "set up Y".',
      ),
    steps: z.array(taskStepSchema).default([]),
    dods: z.array(taskDodSchema).default([]),
    status: taskStatusSchema.default('todo'),
    difficulty: taskDifficultySchema.default('medium'),
    estimatedTimeMinutes: z.coerce
      .number()
      .int()
      .nullish()
      .openapi({ description: 'Estimated time in minutes' }),
    position: z.number().int().default(0),
    completedAt: z.string().nullish(),
    createdBy: idSchema,
    ...timestampSchema,
  })
  .openapi('Task');

/**
 * Generic task update — one or more scalar task fields. `milestoneId` is NOT
 * here: the positions endpoint owns cross-milestone moves. When `status` is
 * set to `in_progress`, the API also points `project_progress.currentTaskId`
 * at this task (the task becomes the "current/active" one being worked on).
 */
export const updateTaskSchema = taskSchema
  .pick({
    title: true,
    description: true,
    status: true,
  })
  .partial();

/** A note attached to a task — persisted row DTO. `content` is the structured
 * document (e.g. Tiptap JSON); `contentText` is the plain-text render. */
export const taskNoteSchema = z
  .object({
    id: idSchema,
    taskId: idSchema,
    title: z.string().max(255).default('Untitled').openapi({ example: 'Setup notes' }),
    content: z.record(z.string(), z.unknown()),
    contentText: z.string().nullable().openapi({ example: 'Install Postgres and configure…' }),
    ...timestampSchema,
  })
  .openapi('TaskNote');

/** Create payload — title + document JSON (+ optional plain-text render). */
export const createTaskNoteSchema = z.object({
  title: z.string().min(1).max(255).openapi({ example: 'Setup notes' }),
  content: z.record(z.string(), z.unknown()),
  contentText: z.string().nullish(),
});

/** Update payload — any subset of the note's editable fields. */
export const updateTaskNoteSchema = createTaskNoteSchema.partial();

export const submitOnboardingOutputSchema = z.object({
  runId: z.uuid(),
});

/**
 * A task step in the LLM "draft" shape — no ids/ownership, only what the model
 * produces. Derived from `taskStepSchema` so the two can never drift apart.
 */
const kickoffTaskStepSchema = taskStepSchema.omit({
  id: true,
  taskId: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * A task's definition-of-done item in the LLM "draft" shape — no ids/ownership.
 * Derived from `taskDodSchema` so the two can never drift apart.
 */
const kickoffTaskDodSchema = taskDodSchema.omit({
  id: true,
  taskId: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * A milestone's tasks in the LLM "draft" shape — no ids/ownership, only what the
 * model produces. Derived from `taskSchema` so the two can never drift apart.
 */
const kickoffTaskSchema = taskSchema
  .omit({
    id: true,
    createdBy: true,
    createdAt: true,
    completedAt: true,
    updatedAt: true,
  })
  .extend({
    estimatedTimeMinutes: z.coerce
      .number()
      .int()
      .min(5)
      .describe(
        'How long this task will realistically take, in minutes — always provide a concrete estimate ' +
          '(e.g. 45, 90, 240). Never null.',
      ),
    dods: z
      .array(kickoffTaskDodSchema)
      .min(1)
      .max(5)
      .describe(
        'Definition-of-done criteria: concrete, verifiable statements of how the user knows this task ' +
          'is actually finished — acceptance criteria or outcomes, not actions. A task may only be ' +
          'completed when every one of these is satisfied.',
      ),
    steps: z
      .array(kickoffTaskStepSchema)
      .min(1)
      .max(5)
      .describe(
        'Detailed, step-by-step instructions specific to what the source material actually shows — ' +
          'concrete enough that the user could complete this task without going back to the original ' +
          'video or docs. Name specific APIs, commands, or concepts to use, not just what to accomplish.',
      ),
  });

/** A draft milestone with its draft tasks — the unit an AI kickoff run returns. */
const kickoffMilestoneSchema = milestoneSchema
  .omit({
    id: true,
    projectId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tasks: z.array(kickoffTaskSchema).min(1).max(5),
  });

export const kickoffKeyTopicSchema = z.object({
  topic: z.string().min(10).max(100),
  description: z.string().min(50).max(300),
});

export const kickoffSummarySchema = z.object({
  overview: z.string().min(50).max(750),
  keyTopics: z.array(kickoffKeyTopicSchema).min(1).max(12),
  highlights: z.array(z.string().min(20).max(200)).min(1).max(6),
});

/** Call-1 draft shape: only the milestones — the summary is generated separately. */
export const kickoffMilestonesSchema = z.object({
  milestones: z.array(kickoffMilestoneSchema).min(1).max(8),
});

export const kickoffPlanSchema = z.object({
  summary: kickoffSummarySchema,
  milestones: z.array(kickoffMilestoneSchema).min(1).max(8),
});

/** A persisted milestone with its full, persisted tasks nested. */
export const milestoneWithTasksSchema = milestoneSchema
  .extend({
    tasks: z.array(taskSchema),
  })
  .openapi('MilestoneWithTasks');

export const milestonesWithTasksSchema = z
  .array(milestoneWithTasksSchema)
  .openapi('MilestonesWithTasks');

/**
 * Single task plus its resolved foreign keys — what the task detail page needs.
 * `milestone` is nullable because `tasks.milestoneId` is `SET NULL` on delete;
 * `project`/`createdBy` are always present (NOT NULL columns).
 */
export const taskDetailSchema = taskSchema
  .extend({
    /** Percentage of completed DoD items (0-100), mirroring project progress. */
    progress: z.number().int().min(0).max(100),
    milestone: milestoneSchema.nullable(),
    project: projectSchema,
    createdBy: userSchema,
  })
  .openapi('TaskDetail');

/** Toggles one step/DoD item's status from the task detail checkboxes. */
export const taskItemStatusUpdateSchema = z.object({
  status: taskStepStatusSchema,
});

/** Marks a task complete — the caller is gated on all DoD items being done. */
export const taskCompleteParamsSchema = z.object({
  taskId: idSchema.openapi({
    param: { name: 'taskId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const taskStepParamsSchema = taskCompleteParamsSchema.extend({
  stepId: idSchema.openapi({
    param: { name: 'stepId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const taskDodParamsSchema = taskCompleteParamsSchema.extend({
  dodId: idSchema.openapi({
    param: { name: 'dodId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const taskNoteParamsSchema = taskCompleteParamsSchema.extend({
  noteId: idSchema.openapi({
    param: { name: 'noteId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

/**
 * Bulk reorder payload for milestones and their tasks. Positions are NOT part
 * of the request — the server renumbers 0..n-1 by array order. Tasks nested
 * under a milestone move with it (their `milestoneId` is set to that group),
 * which is what makes cross-milestone drags expressible in one call.
 */
export const projectMilestonesTasksSchema = z.object({
  milestones: z
    .array(
      milestoneSchema.pick({ id: true }).extend({
        tasks: z.array(taskSchema.pick({ id: true })).default([]),
      }),
    )
    .min(1),
});

/** Completing onboarding returns the project along with the joined plan. */
export const completeOnboardingSchema = kickoffPlanSchema
  .extend({ project: projectSchema })
  .openapi('CompleteOnboarding');

/**
 * Project + live aggregates: workspace/detail views (project list & detail)
 * surface progress, the current task, and resource counts alongside the
 * base project fields. Kept separate from `projectSchema` because create/
 * update/complete return the lean shape without these aggregates.
 */
export const projectDetailSchema = projectSchema
  .extend({
    summary: kickoffSummarySchema.nullable(),
    lastOpenedAt: z.string().nullish(),
    currentTask: taskSchema.nullish(),
    progressPercentage: z.number().nullish(),
    numOfTasks: z.number().int(),
    numOfCompletedTasks: z.number().int(),
    numOfMilestones: z.number().int(),
    numOfArtifacts: z.number().int(),
    numOfDeliverables: z.number().int(),
    numOfKnowledgeSources: z.number().int(),
  })
  .openapi('ProjectDetail');

export const projectDetailListSchema = z.array(projectDetailSchema).openapi('Projects');

export const plannerItemSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: z.string().min(1).max(255).openapi({ example: 'Ship the planner MVP' }),
    description: z.string().nullable().openapi({ example: 'Break down the initial milestone' }),
    status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
    difficulty: z.enum(['low', 'medium', 'high']).default('medium'),
    sortOrder: z.number().int().default(0),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    ...timestampSchema,
  })
  .openapi('PlannerItem');

export const createPlannerItemSchema = plannerItemSchema.pick({
  projectId: true,
  title: true,
  description: true,
  status: true,
  difficulty: true,
  sortOrder: true,
});
export const updatePlannerItemSchema = createPlannerItemSchema.partial();

export const plannerItemListSchema = z.array(plannerItemSchema).openapi('PlannerItems');
