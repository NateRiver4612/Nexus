import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';
import { projectSchema } from './projects';

export const milestoneStatusSchema = z.enum(['planned', 'active', 'paused', 'completed']);
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'cancelled']);
export const taskDifficultySchema = z.enum(['low', 'medium', 'high']);

export const milestoneSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: z.string().min(1).max(255).openapi({ example: 'Foundation' }),
    description: z.string().nullable().openapi({ example: 'Core setup' }),
    position: z.number().int().default(0),
    status: milestoneStatusSchema.default('planned'),
    ...timestampSchema,
  })
  .openapi('Milestone');

export const taskSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    milestoneId: idSchema.nullable(),
    title: z.string().min(1).max(255).openapi({ example: 'Set up Postgres' }),
    description: z.string().nullable().openapi({ example: 'Provision the database' }),
    instructions: z
      .array(z.string().min(50).max(500))
      .min(2)
      .max(6)
      .describe(
        'Detailed, step-by-step instructions specific to what the source material actually shows — ' +
          'concrete enough that the user could complete this task without going back to the original ' +
          'video or docs. Name specific APIs, commands, or concepts to use, not just what to accomplish.',
      ),
    status: taskStatusSchema.default('todo'),
    difficulty: taskDifficultySchema.default('medium'),
    estimatedTime: z.coerce
      .number()
      .int()
      .nullish()
      .openapi({ description: 'Estimated time in minutes' }),
    actualTime: z.coerce
      .number()
      .int()
      .nullish()
      .openapi({ description: 'Actual time spent, in minutes' }),
    position: z.number().int().default(0),
    completedAt: z.string().nullish(),
    createdBy: idSchema,
    ...timestampSchema,
  })
  .openapi('Task');

export const projectProgressSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    progressPercentage: z.number().int().min(0).max(100).default(0),
    currentTaskId: idSchema.nullable(),
    lastOpenedAt: z.string().openapi({ example: '2026-09-12T10:00:00.000Z' }),
    ...timestampSchema,
  })
  .openapi('ProjectProgress');

export const submitOnboardingOutputSchema = z.object({
  runId: z.uuid(),
});

export const kickoffPlanSchema = z.object({
  milestones: z.array(
    milestoneSchema
      .extend({
        tasks: z.array(
          taskSchema.omit({
            id: true,
            milestoneId: true,
            projectId: true,
            createdBy: true,
            createdAt: true,
            completedAt: true,
          }),
        ),
      })
      .omit({
        createdAt: true,
        projectId: true,
        id: true,
      }),
  ),
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
    lastOpenedAt: z.string().nullish(),
    currentTask: taskSchema.nullish(),
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
