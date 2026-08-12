import { z } from 'zod';

export const projectSchemas = {
  create: z.object({ name: z.string().min(1), slug: z.string().min(1) }),
  update: z.object({ name: z.string().min(1).optional(), slug: z.string().min(1).optional() }),
};
