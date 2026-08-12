import { z } from 'zod';

export const userSchemas = {
  updatePreferences: z.object({ theme: z.enum(['light', 'dark', 'system']).optional() }),
};
