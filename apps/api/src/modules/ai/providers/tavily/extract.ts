import { z } from 'zod';

import type { WebExtractInput, WebExtractResult } from '../../types';
import { getClient } from './client';
import { ResearchProviderError, toResearchError } from './errors';

const BASIC_TIMEOUT_SECONDS = 20;
const ADVANCED_TIMEOUT_SECONDS = 45;
const FOCUS_CHUNKS_PER_PAGE = 5;
const MAX_REASON_CHARS = 200;

// Tavily's REST docs show snake_case (`raw_content`, `failed_results`), but `@tavily/core`
// converts those to camelCase before returning, so camelCase is what this function actually
// receives. Keep both spellings as a fallback in case the SDK changes or we switch to raw fetch.
const rawPageSchema = z.object({
  url: z.string(),
  rawContent: z.string().nullish(),
  raw_content: z.string().nullish(),
});
const rawFailureSchema = z.object({ url: z.string(), error: z.string().nullish() });
const rawExtractResponseSchema = z.object({
  results: z.array(rawPageSchema),
  failedResults: z.array(rawFailureSchema).nullish(),
  failed_results: z.array(rawFailureSchema).nullish(),
});

/**
 * Maps a raw Tavily extract response onto `WebExtractResult`, normalizing the casing and folding
 * pages with no readable text into `failed`. Exported pure so tests can feed raw shapes in
 * without a live client.
 */
export function normalizeExtractResponse({ response }: { response: unknown }): WebExtractResult {
  const parsed = rawExtractResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new ResearchProviderError({
      kind: 'unavailable',
      message: 'Tavily extract returned an unexpected response shape',
    });
  }

  const pages: WebExtractResult['pages'] = [];
  const failed: WebExtractResult['failed'] = [];

  for (const page of parsed.data.results) {
    const content = (page.rawContent ?? page.raw_content ?? '').trim();

    // A page with no text is a failure for the caller, not a successful empty read.
    if (content) pages.push({ url: page.url, content });
    else failed.push({ url: page.url, reason: 'the page had no readable text' });
  }

  for (const failure of parsed.data.failedResults ?? parsed.data.failed_results ?? []) {
    failed.push({
      url: failure.url,
      reason: failure.error?.trim().slice(0, MAX_REASON_CHARS) || 'the page could not be read',
    });
  }

  return { pages, failed };
}

async function extractAtDepth({
  urls,
  focus,
  depth,
}: WebExtractInput & { depth: 'basic' | 'advanced' }): Promise<WebExtractResult> {
  let response: unknown;

  try {
    response = await getClient().extract(urls, {
      extractDepth: depth,
      format: 'markdown',
      includeImages: false,
      timeout: depth === 'basic' ? BASIC_TIMEOUT_SECONDS : ADVANCED_TIMEOUT_SECONDS,
      // With a focus Tavily returns only the best-matching chunks, not the whole page.
      ...(focus ? { query: focus, chunksPerSource: FOCUS_CHUNKS_PER_PAGE } : {}),
    });
  } catch (error) {
    throw toResearchError({ error, operation: 'extract' });
  }

  return normalizeExtractResponse({ response });
}

export async function extract({ urls, focus }: WebExtractInput): Promise<WebExtractResult> {
  const first = await extractAtDepth({ urls, focus, depth: 'basic' });
  if (first.failed.length === 0) return first;

  // Basic can't render JavaScript. Retry only the misses at advanced depth (2x credits), and
  // keep what basic already read if that retry itself fails.
  try {
    const retry = await extractAtDepth({
      urls: first.failed.map((failure) => failure.url),
      focus,
      depth: 'advanced',
    });
    return { pages: [...first.pages, ...retry.pages], failed: retry.failed };
  } catch {
    return first;
  }
}
