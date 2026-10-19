import { tavily } from '@tavily/core';
import type {
  ResearchPollType,
  ResearchProviderType,
  ResearchStatusType,
  StartResearchParamsType,
  StartResearchResultType,
} from '@nexus/types';
import { researchPollResponseSchema, startResearchResultSchema } from '@nexus/zod-schemas';

import { env } from '../../../../env';
import { ResearchProviderError, toResearchError } from './errors';

const START_TIMEOUT_SECONDS = 30;

export const getClient = () => {
  const apiKey = env.TAVILY_API_KEY;
  // Without a key the SDK does not fail — it silently switches to Tavily's keyless free mode,
  // which has much tighter limits. Fail loudly instead, so a missing key is never mistaken
  // for a rate-limit problem later.
  if (!apiKey) {
    throw new ResearchProviderError({ kind: 'config', message: 'TAVILY_API_KEY is not set' });
  }
  return tavily({ apiKey });
};

function normalizeStatus({ value }: { value: string }): ResearchStatusType {
  switch (value.toLowerCase()) {
    case 'pending':
    case 'queued':
      return 'pending';
    case 'in_progress':
    case 'running':
      return 'in_progress';
    case 'completed':
    case 'complete':
      return 'completed';
    case 'failed':
    case 'error':
      return 'failed';
    default:
      // An unknown status is more likely a new in-flight state than a terminal one, so keep polling.
      console.warn(`[tavily] unknown research status "${value}", treating as in_progress`);
      return 'in_progress';
  }
}

async function startResearch({
  prompt,
  model,
  outputSchema,
}: StartResearchParamsType): Promise<StartResearchResultType> {
  let response: unknown;

  try {
    response = await getClient().research(prompt, {
      model,
      stream: false,
      timeout: START_TIMEOUT_SECONDS,
      ...(outputSchema ? { outputSchema } : {}),
    });
  } catch (error) {
    throw toResearchError({ error, operation: 'start' });
  }

  const parsed = startResearchResultSchema.safeParse(response);

  if (!parsed.success) {
    throw new ResearchProviderError({
      kind: 'unavailable',
      message: 'Tavily research start returned an unexpected response shape',
    });
  }

  return { requestId: parsed.data.requestId };
}

async function getResearch({ requestId }: { requestId: string }): Promise<ResearchPollType> {
  let response: unknown;

  try {
    response = await getClient().getResearch(requestId, {
      includeUsage: true,
    });
  } catch (error) {
    throw toResearchError({ error, operation: 'poll' });
  }

  const parsed = researchPollResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new ResearchProviderError({
      kind: 'unavailable',
      message: 'Tavily research poll returned an unexpected response shape',
    });
  }

  const status = normalizeStatus({ value: parsed.data.status });

  if (status === 'pending' || status === 'in_progress') return { status };

  if (status === 'failed') {
    return { status, reason: parsed.data.error ?? 'Tavily reported the research as failed' };
  }

  if (parsed.data.content == null) {
    throw new ResearchProviderError({
      kind: 'unavailable',
      message: 'Tavily research completed without content',
    });
  }

  const content = parseContent({ content: parsed.data.content });

  if (content == null) {
    throw new ResearchProviderError({
      kind: 'unavailable',
      message: 'Tavily research completed with unparseable content',
    });
  }

  return {
    status,
    content,
    sources: (parsed.data.sources ?? []).map((source) => ({
      title: source.title ?? source.url,
      url: source.url,
      favicon: source.favicon ?? '',
    })),
    responseTime: parsed.data.response_time == null ? null : Math.round(parsed.data.response_time),
    creditsUsed: parsed.data.usage?.credits ?? null,
  };
}

/**
 * Tavily returns `content` as an object when `output_schema` is used, but it can also send
 * the same payload as a JSON string. Normalize the string form so the digest gate always
 * receives an object.
 */
function parseContent({
  content,
}: {
  content: Record<string, unknown> | string | undefined;
}): Record<string, unknown> | null {
  if (content == null) return null;
  if (typeof content === 'object') return content;

  try {
    const parsed: unknown = JSON.parse(content);
    return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function createTavilyProvider(): ResearchProviderType {
  return { name: 'tavily', startResearch, getResearch };
}
