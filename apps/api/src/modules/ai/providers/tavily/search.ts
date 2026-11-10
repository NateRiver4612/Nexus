import type { TavilySearchResponse } from '@tavily/core';
import { z } from 'zod';

import type { WebSearchInput, WebSearchResult } from '../../types';
import { getClient } from './client';
import { ResearchProviderError, toResearchError } from './errors';

const DEFAULT_MAX_RESULTS = 10;
const SEARCH_TIMEOUT_SECONDS = 15;

// The REST API returns `published_date` (per Tavily's docs), but `@tavily/core` maps it to
// `publishedDate` before returning, so camelCase is what actually arrives. Keep both as a fallback.
const rawResultSchema = z.object({
  title: z.string().nullish(),
  url: z.string().nullish(),
  content: z.string().nullish(),
  score: z.number().nullish(),
  publishedDate: z.string().nullish(),
  published_date: z.string().nullish(),
  favicon: z.string().nullish(),
});

const rawSearchResponseSchema = z.object({ results: z.array(rawResultSchema) });

export async function search({
  query,
  maxResults = DEFAULT_MAX_RESULTS,
}: WebSearchInput): Promise<WebSearchResult[]> {
  let response: TavilySearchResponse;

  try {
    response = await getClient().search(query, {
      // `basic` is 1 credit; `advanced` is 2. Start cheap and upgrade only if quality demands it.
      searchDepth: 'basic',
      maxResults,
      topic: 'general',
      // The chat model writes the answer. Tavily's own `answer` is an extra LLM call we'd
      // pay for and then ignore.
      includeAnswer: false,
      includeRawContent: false,
      includeImages: false,
      includeFavicon: true,
      // Not in the SDK's typed options yet; Tavily forwards unknown keys to the REST field.
      // Without this, `publishedDate` is never populated for `topic: 'general'`.
      include_published_date: true,
      timeout: SEARCH_TIMEOUT_SECONDS,
    });
  } catch (error) {
    throw toResearchError({ error, operation: 'search' });
  }

  const parsed = rawSearchResponseSchema.safeParse(response);

  if (!parsed.success) {
    // Safe to retry, unlike a research submit: search is a read and costs at most one credit.
    throw new ResearchProviderError({
      kind: 'unavailable',
      message: 'Tavily search returned an unexpected response shape',
    });
  }

  // Tavily usually honors maxResults, but cap it here too: one call must never exceed the limit.
  return parsed.data.results.slice(0, maxResults).flatMap((result) => {
    // A hit without a URL can't be cited, so it is useless to the chat; drop it quietly.
    if (!result.url) return [];

    return [
      {
        title: result.title?.trim() || result.url,
        url: result.url,
        content: result.content?.trim() ?? '',
        publishedDate: result.publishedDate?.trim() || result.published_date?.trim() || null,
        score: result.score ?? null,
        favicon: result.favicon ?? null,
      },
    ];
  });
}
