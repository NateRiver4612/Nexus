import { z } from '@hono/zod-openapi';

import { idSchema } from './common';

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
    createdAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
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
