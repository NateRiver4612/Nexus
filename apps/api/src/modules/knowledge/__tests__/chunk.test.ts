import { describe, expect, test } from 'bun:test';

import { chunkText } from '../chunk';

const TARGET_CHARS = 800 * 4;
const OVERLAP_CHARS = 80 * 4;
// A chunk can carry the overlap tail plus one full piece, so this is the real upper bound.
const MAX_CHUNK_CHARS = TARGET_CHARS + OVERLAP_CHARS + 1;

describe('chunkText', () => {
  test('hard-splits unpunctuated non-Latin text under the input cap', () => {
    // Bengali-style transcript: words separated by spaces, no ASCII .!? sentence breaks.
    const text = 'হ্যালো সবাই এই ভিডিওতে আমি আপনাদের দেখাবো '.repeat(600);

    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
    }
  });

  test('hard-splits a single run with no whitespace', () => {
    const chunks = chunkText('a'.repeat(TARGET_CHARS * 5));

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
    }
  });

  test('keeps overlap between consecutive chunks', () => {
    const words = Array.from({ length: 6000 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkText(words);

    expect(chunks.length).toBeGreaterThan(1);
    const tail = chunks[0]!.slice(-200).trim();
    expect(chunks[1]!).toContain(tail);
  });

  test('returns no chunks for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });
});
