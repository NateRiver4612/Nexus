import { z } from '@hono/zod-openapi';

export const idSchema = z.string().uuid().openapi({
  example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
});

export const idParamsSchema = z.object({
  id: idSchema.openapi({
    param: { name: 'id', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const projectIdParamsSchema = z.object({
  projectId: idSchema.openapi({
    param: { name: 'projectId', in: 'path' },
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }),
});

export const errorSchema = z
  .object({
    type: z.enum(['AuthError', 'ValidationError', 'NotFoundError', 'ServerError']),
    message: z.string(),
    issues: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi('Error');

export const errorResponseSchema = z.object({ error: errorSchema }).openapi('ErrorResponse');

export const okSchema = z.object({ ok: z.boolean() }).openapi('Ok');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
