import { z } from 'zod';

export const plannerSchemas = {
  create: z.object({ title: z.string().min(1), projectId: z.string() }),
  update: z.object({ title: z.string().min(1).optional(), status: z.string().optional() }),
};
