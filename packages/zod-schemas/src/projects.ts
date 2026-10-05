import { z } from '@hono/zod-openapi';

import { idSchema } from './common';

export const projectSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255).openapi({ example: 'Nexus' }),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/)
      .openapi({ example: 'nexus' }),
    description: z
      .string()
      .nullable()
      .openapi({ example: 'Modular monolith for planning and collaboration' }),
    status: z.enum(['active', 'archived']).default('active'),
    createdAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
  })
  .openapi('Project');

export const createProjectSchema = projectSchema.pick({
  name: true,
  slug: true,
  description: true,
});
export const updateProjectSchema = createProjectSchema.partial();

export const projectListSchema = z.array(projectSchema).openapi('Projects');
