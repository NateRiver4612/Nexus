import {
  accordionBlockSchema,
  compareBlockSchema,
  richBlockLanguages,
  statsBlockSchema,
  stepsBlockSchema,
} from '@nexus/zod-schemas';
import { describe, expect, test } from 'bun:test';

describe('richBlockLanguages', () => {
  test('lists each block once', () => {
    expect(new Set(richBlockLanguages).size).toBe(richBlockLanguages.length);
    expect([...richBlockLanguages].sort()).toEqual(['accordion', 'compare', 'stats', 'steps']);
  });
});

describe('statsBlockSchema', () => {
  test('turns a numeric value into text and keeps optional fields', () => {
    const result = statsBlockSchema.parse([
      { label: 'Tasks', value: 12, detail: 'this week', tone: 'success' },
    ]);
    expect(result).toEqual([{ label: 'Tasks', value: '12', detail: 'this week', tone: 'success' }]);
  });

  test('accepts any tone string, so a typo does not break the block', () => {
    expect(statsBlockSchema.safeParse([{ label: 'A', value: 1, tone: 'purple-ish' }]).success).toBe(
      true,
    );
  });

  test('rejects a missing label, an empty list and more than 6 stats', () => {
    expect(statsBlockSchema.safeParse([{ value: 1 }]).success).toBe(false);
    expect(statsBlockSchema.safeParse([]).success).toBe(false);
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `S${i}`, value: i }));
    expect(statsBlockSchema.safeParse(seven).success).toBe(false);
  });
});

describe('stepsBlockSchema', () => {
  test('accepts objects and plain strings in the same list', () => {
    const result = stepsBlockSchema.safeParse([{ title: 'Plan', status: 'done' }, 'Build it']);
    expect(result.success).toBe(true);
  });

  test('accepts an unknown status string', () => {
    expect(
      stepsBlockSchema.safeParse([{ title: 'Plan', status: 'blocked-on-review' }]).success,
    ).toBe(true);
  });

  test('rejects an object without a title, an empty string and more than 12 steps', () => {
    expect(stepsBlockSchema.safeParse([{ body: 'no title' }]).success).toBe(false);
    expect(stepsBlockSchema.safeParse(['']).success).toBe(false);
    expect(
      stepsBlockSchema.safeParse(Array.from({ length: 13 }, (_, i) => `Step ${i}`)).success,
    ).toBe(false);
  });
});

describe('compareBlockSchema', () => {
  const column = (title: string) => ({ title, items: ['one', 'two'] });

  test('needs 2 or 3 columns', () => {
    expect(compareBlockSchema.safeParse([column('A')]).success).toBe(false);
    expect(compareBlockSchema.safeParse([column('A'), column('B')]).success).toBe(true);
    expect(compareBlockSchema.safeParse([column('A'), column('B'), column('C')]).success).toBe(
      true,
    );
    expect(
      compareBlockSchema.safeParse([column('A'), column('B'), column('C'), column('D')]).success,
    ).toBe(false);
  });

  test('rejects a column with no items', () => {
    expect(compareBlockSchema.safeParse([column('A'), { title: 'B', items: [] }]).success).toBe(
      false,
    );
  });
});

describe('accordionBlockSchema', () => {
  test('accepts title and markdown body', () => {
    const result = accordionBlockSchema.safeParse([
      { title: 'Q1', body: 'A **bold** answer\n- one\n- two' },
    ]);
    expect(result.success).toBe(true);
  });

  test('rejects a missing or empty body and a missing title', () => {
    expect(accordionBlockSchema.safeParse([{ title: 'Only a title' }]).success).toBe(false);
    expect(accordionBlockSchema.safeParse([{ title: 'Q', body: '' }]).success).toBe(false);
    expect(accordionBlockSchema.safeParse([{ body: 'no title' }]).success).toBe(false);
  });

  test('rejects more than 12 items and a body over 3000 characters', () => {
    const items = Array.from({ length: 13 }, (_, i) => ({ title: `Q${i}`, body: 'a' }));
    expect(accordionBlockSchema.safeParse(items).success).toBe(false);
    expect(accordionBlockSchema.safeParse([{ title: 'Q', body: 'a'.repeat(3001) }]).success).toBe(
      false,
    );
  });
});
