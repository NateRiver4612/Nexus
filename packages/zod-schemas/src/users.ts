import { z } from '@hono/zod-openapi';

import { idSchema } from './common';

export const userSchema = z
  .object({
    id: idSchema,
    email: z.string().email().openapi({ example: 'ada@nexus.dev' }),
    name: z.string().nullable().openapi({ example: 'Ada Lovelace' }),
    image: z.string().nullable().openapi({ example: 'https://nexus.dev/ada.png' }),
  })
  .openapi('User');
