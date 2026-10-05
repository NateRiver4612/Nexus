import type { z } from 'zod';

import { HttpError } from './errors';

export async function parseBody<T>(body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw HttpError.validation('Invalid request body', result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseParams<T>(params: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw HttpError.validation('Invalid request parameters', result.error.flatten().fieldErrors);
  }
  return result.data;
}
