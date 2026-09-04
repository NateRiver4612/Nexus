import { z } from '@hono/zod-openapi';

import { idSchema, timestampSchema } from './common';

export const notificationSchema = z
  .object({
    id: idSchema,
    projectId: idSchema.nullable(),
    kind: z.string().max(48).openapi({ example: 'mention' }),
    title: z.string().min(1).max(255).openapi({ example: 'You were mentioned' }),
    body: z.string().nullable().openapi({ example: 'Someone tagged you in a comment.' }),
    readAt: z.string().nullable().openapi({ example: '2026-08-12T00:00:00.000Z' }),
    ...timestampSchema,
  })
  .openapi('Notification');

export const createNotificationSchema = notificationSchema.pick({
  projectId: true,
  kind: true,
  title: true,
  body: true,
});

export const notificationListSchema = z.array(notificationSchema).openapi('Notifications');
