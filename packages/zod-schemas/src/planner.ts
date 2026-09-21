import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';
import { projectSchema } from './projects';

export const milestoneStatusSchema = z.enum(['planned', 'active', 'paused', 'completed']);
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'cancelled']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

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
    status: taskStatusSchema.default('todo'),
    priority: taskPrioritySchema.default('medium'),
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
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
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
  priority: true,
  sortOrder: true,
});
export const updatePlannerItemSchema = createPlannerItemSchema.partial();

export const plannerItemListSchema = z.array(plannerItemSchema).openapi('PlannerItems');
