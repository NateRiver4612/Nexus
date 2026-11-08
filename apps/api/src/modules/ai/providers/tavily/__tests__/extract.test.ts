import { describe, expect, test } from 'bun:test';

import { normalizeExtractResponse } from '../extract';
import { ResearchProviderError } from '../errors';

describe('normalizeExtractResponse', () => {
  test('normalizes casing and folds empty pages into failed', () => {
    const result = normalizeExtractResponse({
      response: {
        results: [
          { url: 'https://a.com', rawContent: '  hello  ' },
          { url: 'https://b.com', raw_content: ' world ' },
          { url: 'https://empty.com', rawContent: '   ' },
        ],
        failed_results: [{ url: 'https://c.com', error: '  timeout  ' }],
      },
    });

    expect(result.pages).toEqual([
      { url: 'https://a.com', content: 'hello' },
      { url: 'https://b.com', content: 'world' },
    ]);
    expect(result.failed).toEqual([
      { url: 'https://empty.com', reason: 'the page had no readable text' },
      { url: 'https://c.com', reason: 'timeout' },
    ]);
  });

  test('falls back to a generic reason when none is provided', () => {
    const result = normalizeExtractResponse({
      response: { results: [], failedResults: [{ url: 'https://c.com', error: null }] },
    });

    expect(result.failed).toEqual([{ url: 'https://c.com', reason: 'the page could not be read' }]);
  });

  test('throws unavailable on an unexpected shape', () => {
    expect(() => normalizeExtractResponse({ response: { unexpected: true } })).toThrow(
      ResearchProviderError,
    );
  });
});
