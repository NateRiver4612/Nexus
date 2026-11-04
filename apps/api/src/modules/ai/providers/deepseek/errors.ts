import OpenAI from 'openai';

export type AIProviderErrorKind =
  | 'config' // invalid API key or no balance, retrying cannot help
  | 'rate_limited' // slow down and retry
  | 'bad_request' // our request was invalid, retrying cannot help
  | 'unavailable' // network failure, timeout, 5xx, worth retrying
  | 'unknown';

export class AIProviderError extends Error {
  constructor(
    readonly kind: AIProviderErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'AIProviderError';
  }
}

export function toAIProviderError(err: unknown): AIProviderError {
  if (err instanceof AIProviderError) return err;
  const message = err instanceof Error ? err.message : String(err);

  // Timeouts are a subclass of APIConnectionError, so they land here too.
  if (err instanceof OpenAI.APIConnectionError) {
    return new AIProviderError('unavailable', message, { cause: err });
  }
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? 0;
    if (status === 401 || status === 402)
      return new AIProviderError('config', message, { cause: err });
    if (status === 400 || status === 422)
      return new AIProviderError('bad_request', message, { cause: err });
    if (status === 429) return new AIProviderError('rate_limited', message, { cause: err });
    if (status >= 500) return new AIProviderError('unavailable', message, { cause: err });
  }
  return new AIProviderError('unknown', message, { cause: err });
}
