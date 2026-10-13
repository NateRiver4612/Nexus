import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorType = 'AuthError' | 'ValidationError' | 'NotFoundError' | 'ServerError';

export class HttpError extends Error {
  readonly type: ErrorType;
  readonly status: number;
  issues?: Record<string, unknown>;

  constructor(status: number, type: ErrorType, message: string, issues?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.type = type;
    this.issues = issues;
  }
}

// ---------------------------------------------------------------------------
// Status factories — one per status. Reuse these everywhere instead of
// `new HttpError(...)` directly; each attaches the correct status + type.
// ---------------------------------------------------------------------------

export function NotFoundError(message = 'Resource not found'): HttpError {
  return new HttpError(404, 'NotFoundError', message);
}

export function UnauthorizedError(message = 'Authentication required'): HttpError {
  return new HttpError(401, 'AuthError', message);
}

export function ForbiddenError(message = 'Forbidden'): HttpError {
  return new HttpError(403, 'AuthError', message);
}

export function ValidationError(message: string, issues?: Record<string, unknown>): HttpError {
  return new HttpError(400, 'ValidationError', message, issues);
}

export function InternalError(message = 'Internal server error'): HttpError {
  return new HttpError(500, 'ServerError', message);
}

export function ConflictError(message = 'Conflict'): HttpError {
  return new HttpError(409, 'ValidationError', message);
}

// ---------------------------------------------------------------------------
// Guards — call-site hygiene for the common null-check + throw pattern.
// ---------------------------------------------------------------------------

/**
 * Returns `value` unchanged when present; otherwise throws the given error
 * (not found by default). Typed so the narrowed result flows on:
 * `const note = ensureExists(await repo.get(id))` → `note` is the row type.
 */
export function ensureExists<T>(
  value: T | null | undefined,
  error: HttpError = NotFoundError(),
): T {
  if (value == null || (Array.isArray(value) && value.length === 0)) throw error;
  return value;
}

/** Asserts a condition, otherwise throws — good for permission/ownership checks. */
export function ensure(condition: unknown, error: HttpError): asserts condition {
  if (!condition) throw error;
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