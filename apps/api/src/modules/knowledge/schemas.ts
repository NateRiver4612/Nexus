import { z } from 'zod';

export const knowledgeSchemas = {
  create: z.object({ title: z.string().min(1), projectId: z.string() }),
  update: z.object({ title: z.string().min(1).optional(), body: z.string().optional() }),
};
