import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class HttpError extends Error {
  readonly type: 'AuthError' | 'ValidationError' | 'NotFoundError' | 'ServerError';
  readonly status: number;
  issues?: Record<string, unknown>;

  constructor(
    status: number,
    type: 'AuthError' | 'ValidationError' | 'NotFoundError' | 'ServerError',
    message: string,
    issues?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.type = type;
    this.issues = issues;
  }

  static notFound(message = 'Resource not found') {
    return new HttpError(404, 'NotFoundError', message);
  }

  static unauthorized(message = 'Authentication required') {
    return new HttpError(401, 'AuthError', message);
  }

  static forbidden(message = 'Forbidden') {
    return new HttpError(403, 'AuthError', message);
  }

  static validation(message: string, issues?: Record<string, unknown>) {
    return new HttpError(400, 'ValidationError', message, issues);
  }
}

export function handleHttpError(c: Context, err: unknown): Response {
  if (err instanceof HttpError) {
    return c.json(
      { error: { type: err.type, message: err.message, issues: err.issues } },
      err.status as ContentfulStatusCode,
    );
  }

  console.error(err);
  return c.json({ error: { type: 'ServerError', message: 'Internal server error' } }, 500);
}
