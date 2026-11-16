import { describe, expect, test } from 'bun:test';

import { extractFromBuffer } from '../extract';

describe('extractFromBuffer', () => {
  test('decodes plain text as UTF-8', async () => {
    const text = await extractFromBuffer({
      body: Buffer.from('hello world'),
      mime: 'text/plain',
    });

    expect(text).toBe('hello world');
  });

  test('decodes markdown as UTF-8', async () => {
    const text = await extractFromBuffer({
      body: Buffer.from('# Title\n\nSome **markdown**.'),
      mime: 'text/markdown',
    });

    expect(text).toContain('# Title');
    expect(text).toContain('**markdown**');
  });

  test('parses CSV into text', async () => {
    const text = await extractFromBuffer({
      body: Buffer.from('name,age\nalice,30\nbob,25'),
      mime: 'text/csv',
    });

    expect(text).toContain('name,age');
    expect(text).toContain('alice,30');
    expect(text).toContain('bob,25');
  });

  test('caps a huge spreadsheet so the output stays bounded', async () => {
    const big = 'a,b,c\n' + '1,2,3\n'.repeat(50_000); // ~300k chars, far over the 100k cap

    const text = await extractFromBuffer({ body: Buffer.from(big), mime: 'text/csv' });

    expect(text.length).toBeLessThan(big.length);
    expect(text).toContain('truncated');
  });
});
