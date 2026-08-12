import { z } from 'zod';

export const notificationSchemas = {
  create: z.object({ type: z.string().min(1), title: z.string().min(1) }),
};
