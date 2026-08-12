import { z } from 'zod';

export const artifactSchemas = {
  create: z.object({ title: z.string().min(1), kind: z.string(), projectId: z.string() }),
  update: z.object({ title: z.string().min(1).optional(), content: z.string().optional() }),
};
