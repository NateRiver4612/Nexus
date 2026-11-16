import { describe, expect, test } from 'bun:test';

import {
  attachmentsOf,
  formatAttachmentStubs,
  formatCurrentTurnAttachments,
} from '../../chat/attachmentContext';

describe('formatCurrentTurnAttachments', () => {
  test('returns nothing when there are no attachments', () => {
    expect(formatCurrentTurnAttachments([])).toBe('');
  });

  test('emits a block with name, type and char count', () => {
    const out = formatCurrentTurnAttachments([
      { name: 'a.txt', mimeType: 'text/plain', text: 'hello' },
    ]);

    expect(out).toContain('name="a.txt"');
    expect(out).toContain('type="text/plain"');
    expect(out).toContain('chars="5"');
    expect(out).toContain('>hello</attachment>');
  });

  test('truncates a file over the per-file budget and flags it', () => {
    const out = formatCurrentTurnAttachments([
      { name: 'big.txt', mimeType: 'text/plain', text: 'x'.repeat(25_000) },
    ]);

    expect(out).toContain('truncated="true"');
    expect(out).toContain('chars="20000"');
  });

  test('omits files once the per-turn budget is spent', () => {
    const file = 'y'.repeat(20_000);
    const out = formatCurrentTurnAttachments([
      { name: 'a.txt', mimeType: 'text/plain', text: file },
      { name: 'b.txt', mimeType: 'text/plain', text: file },
      { name: 'c.txt', mimeType: 'text/plain', text: 'z'.repeat(20_000) },
    ]);

    // a + b spend the full 40k turn budget, so c is omitted rather than truncated mid-file.
    expect(out).toContain('name="c.txt"');
    expect(out).toContain('omitted="true"');
    expect(out).not.toContain('z');
  });
});

describe('formatAttachmentStubs', () => {
  test('returns nothing when there are no attachments', () => {
    expect(formatAttachmentStubs([])).toBe('');
  });

  test('emits one stub line per attachment', () => {
    const out = formatAttachmentStubs([
      { name: 'report.pdf', chars: 12_000 },
      { name: 'notes.md', chars: 400 },
    ]);

    expect(out).toBe(
      [
        '[Attached: report.pdf, 12000 chars. Use read_attachment to reopen.]',
        '[Attached: notes.md, 400 chars. Use read_attachment to reopen.]',
      ].join('\n'),
    );
  });
});

describe('attachmentsOf', () => {
  test('parses a well-formed metadata attachments list', () => {
    const parsed = attachmentsOf({
      attachments: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'a.txt',
          mimeType: 'text/plain',
          size: 5,
        },
      ],
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe('a.txt');
  });

  test('ignores malformed metadata', () => {
    expect(attachmentsOf({ attachments: [{ id: 'not-a-uuid' }] })).toEqual([]);
    expect(attachmentsOf(null)).toEqual([]);
    expect(attachmentsOf({})).toEqual([]);
  });
});
