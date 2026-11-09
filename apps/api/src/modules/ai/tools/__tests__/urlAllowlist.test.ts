import { describe, expect, test } from 'bun:test';

import { collectUrls, normalizeUrl } from '@nexus/shared-helpers';

describe('normalizeUrl', () => {
  test('lowercases the host and drops the fragment', () => {
    expect(normalizeUrl({ url: 'https://Example.com/Path#section' })).toBe(
      'https://example.com/Path',
    );
  });

  test('strips trailing punctuation', () => {
    expect(normalizeUrl({ url: 'https://example.com/page.' })).toBe('https://example.com/page');
  });

  test('rejects non-web schemes and credentials', () => {
    expect(normalizeUrl({ url: 'ftp://example.com' })).toBeNull();
    expect(normalizeUrl({ url: 'https://user:pass@example.com' })).toBeNull();
  });

  test('rejects text that is not a URL', () => {
    expect(normalizeUrl({ url: 'not a url' })).toBeNull();
  });
});

describe('collectUrls', () => {
  test('finds, normalizes and de-duplicates web URLs', () => {
    const text = 'See https://Example.com/a and https://example.com/a, also mailto:x@y.com';
    expect(collectUrls({ text })).toEqual(['https://example.com/a']);
  });

  test('returns nothing for text without web URLs', () => {
    expect(collectUrls({ text: 'no links here' })).toEqual([]);
  });
});
