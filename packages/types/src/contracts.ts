import { z } from 'zod';

export const idSchema = z.string().uuid();

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().nullable(),
  status: z.enum(['active', 'archived']).default('active'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createProjectSchema = projectSchema.pick({
  name: true,
  slug: true,
  description: true,
});
export const updateProjectSchema = createProjectSchema.partial();

export const plannerItemSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createPlannerItemSchema = plannerItemSchema.pick({
  projectId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  sortOrder: true,
});
export const updatePlannerItemSchema = createPlannerItemSchema.partial();

export const artifactSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  kind: z.enum(['note', 'doc', 'resource', 'spec']),
  title: z.string().min(1).max(255),
  content: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createArtifactSchema = artifactSchema.pick({
  projectId: true,
  kind: true,
  title: true,
  content: true,
});
export const updateArtifactSchema = createArtifactSchema.partial();

export const knowledgeItemSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1).max(255),
  body: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createKnowledgeItemSchema = knowledgeItemSchema.pick({
  projectId: true,
  title: true,
  body: true,
  tags: true,
});
export const updateKnowledgeItemSchema = createKnowledgeItemSchema.partial();

export const notificationSchema = z.object({
  id: idSchema,
  projectId: idSchema.nullable(),
  kind: z.string().max(48),
  title: z.string().min(1).max(255),
  body: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  projectId: idSchema.optional(),
  types: z.array(z.enum(['project', 'planner', 'artifact', 'knowledge'])).default([]),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * The modules are exposed under `/api/v1/<module>` on the Hono app.
 * Must stay in sync with `apps/api/src/index.ts`.
 */
export const apiModules = [
  'projects',
  'planner',
  'artifacts',
  'knowledge',
  'notifications',
  'search',
  'users',
] as const;

export type ApiModule = (typeof apiModules)[number];

export type ApiContext = {
  user: { id: string; email: string; name: string | null } | null;
  set: (user: ApiContext['user']) => void;
};

export interface ApiError {
  error: {
    type: 'AuthError' | 'ValidationError' | 'NotFoundError' | 'ServerError';
    message: string;
    issues?: Record<string, unknown>;
  };
}

export type ApiList<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
