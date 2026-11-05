import { AIProviderError } from '../ai/providers/deepseek/errors';
import { ResearchProviderError } from '../ai/providers/tavily/errors';

const TRANSIENT_KINDS = new Set(['unavailable', 'rate_limited']);

/**
 * Transient failures worth another attempt. Covers both the Tavily provider and the
 * brief-builder LLM, so a blip in either is retried by the same whole-run loop.
 *
 * Start-phase ambiguity (timeout, network drop, 5xx, unexpected response) is classified
 * as `timeout` and excluded: the task may already have been accepted, so retrying could
 * create and bill a second research task. Poll-phase errors stay retryable.
 */
export const isRetryableResearchError = ({ error }: { error: unknown }) =>
  (error instanceof ResearchProviderError && TRANSIENT_KINDS.has(error.kind)) ||
  (error instanceof AIProviderError && TRANSIENT_KINDS.has(error.kind));
