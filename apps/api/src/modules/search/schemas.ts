import { z } from 'zod';

export const searchSchemas = {
  query: z.object({ q: z.string().min(1).max(200), projectId: z.string().optional() }),
};
