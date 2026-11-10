import { UnrecoverableError } from 'bullmq';

/**
 * Reasons a per-URL web fetch can fail that may clear on retry (timeouts, rate limits, 5xx,
 * dropped connections). Anything else (404, blocked, no readable text) won't change on retry.
 */
export const TRANSIENT_URL_FAILURE =
  /timeout|timed out|rate limit|too many requests|\b5\d\d\b|temporarily|unavailable|fetch failed|failed to fetch|network/i;

/**
 * Runs a promise and classifies a rejection for the queue:
 * - `isUnrecoverable(error)` true → throw `UnrecoverableError(text)` (BullMQ will NOT retry)
 * - otherwise                     → rethrow the original error (BullMQ retries it)
 *
 * Centralizes the "classify a caught error → fail fast vs retry" pattern used across job
 * processors. `message` overrides the tooltip text; it defaults to the error's own message.
 */
export async function withUnrecoverable<T>({
  promise,
  isUnrecoverable,
  message,
}: {
  promise: Promise<T>;
  isUnrecoverable: (error: unknown) => boolean;
  message?: string | ((error: unknown) => string);
}): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isUnrecoverable(error)) {
      const text =
        typeof message === 'function'
          ? message(error)
          : (message ?? (error instanceof Error ? error.message : String(error)));
      throw new UnrecoverableError(text);
    }
    throw error;
  }
}
