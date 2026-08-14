import { z } from '@hono/zod-openapi';

export const idSchema = z.string().uuid();

export const projectSchema = z
  .object({
    id: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
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

export const plannerItemSchema = z
  .object({
    id: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    projectId: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    title: z.string().min(1).max(255).openapi({ example: 'Ship the planner MVP' }),
    description: z.string().nullable().openapi({ example: 'Break down the initial milestone' }),
    status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    sortOrder: z.number().int().default(0),
    metadata: z.record(z.unknown()).nullable(),
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

export const artifactSchema = z
  .object({
    id: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    projectId: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    kind: z.enum(['note', 'doc', 'resource', 'spec']).openapi({ example: 'note' }),
    title: z.string().min(1).max(255).openapi({ example: 'Nexus architecture' }),
    content: z.string().nullable().openapi({ example: 'High level system diagram' }),
    metadata: z.record(z.unknown()).nullable(),
    createdAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
  })
  .openapi('Artifact');

export const createArtifactSchema = artifactSchema.pick({
  projectId: true,
  kind: true,
  title: true,
  content: true,
});
export const updateArtifactSchema = createArtifactSchema.partial();

export const knowledgeItemSchema = z
  .object({
    id: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    projectId: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    title: z.string().min(1).max(255).openapi({ example: 'Architecture decisions' }),
    body: z.string().nullable().openapi({ example: 'We chose a modular monolith.' }),
    tags: z.array(z.string()).default([]).openapi({ example: ['architecture', 'nexus'] }),
    createdAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
  })
  .openapi('KnowledgeItem');

export const createKnowledgeItemSchema = knowledgeItemSchema.pick({
  projectId: true,
  title: true,
  body: true,
  tags: true,
});
export const updateKnowledgeItemSchema = createKnowledgeItemSchema.partial();

export const notificationSchema = z
  .object({
    id: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    projectId: idSchema.nullable().openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    kind: z.string().max(48).openapi({ example: 'mention' }),
    title: z.string().min(1).max(255).openapi({ example: 'You were mentioned' }),
    body: z.string().nullable().openapi({ example: 'Someone tagged you in a comment.' }),
    readAt: z.string().nullable().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    createdAt: z.string().openapi({ example: '2026-08-12T00:00:00.000Z' }),
  })
  .openapi('Notification');

export const createNotificationSchema = notificationSchema.pick({
  projectId: true,
  kind: true,
  title: true,
  body: true,
});

export const userSchema = z
  .object({
    id: idSchema.openapi({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }),
    email: z.string().email().openapi({ example: 'ada@nexus.dev' }),
    name: z.string().nullable().openapi({ example: 'Ada Lovelace' }),
    image: z.string().nullable().openapi({ example: 'https://nexus.dev/ada.png' }),
  })
  .openapi('User');

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  projectId: idSchema.optional(),
  types: z.array(z.enum(['project', 'planner', 'artifact', 'knowledge'])).default([]),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
