import { describe, expect, test } from 'bun:test';

import { formatConversationArtifacts } from '../../chat/artifactContext';

const artifact = (name: string, latestVersion: number | null = 1) => ({
  name,
  type: 'document' as const,
  latestVersion,
});

describe('formatConversationArtifacts', () => {
  test('returns nothing when there are no artifacts', () => {
    expect(formatConversationArtifacts([])).toBe('');
  });

  test('lists each artifact with its type and latest version', () => {
    expect(formatConversationArtifacts([artifact('BRIEF.md', 2), artifact('PLAN.md')])).toBe(
      ['- BRIEF.md (document, v2)', '- PLAN.md (document, v1)'].join('\n'),
    );
  });

  test('treats a missing version as v1', () => {
    expect(formatConversationArtifacts([artifact('BRIEF.md', null)])).toBe(
      '- BRIEF.md (document, v1)',
    );
  });

  test('caps the list and reports how many were left out', () => {
    const artifacts = Array.from({ length: 22 }, (_, index) => artifact(`FILE_${index}.md`));
    const lines = formatConversationArtifacts(artifacts).split('\n');

    expect(lines).toHaveLength(21);
    expect(lines.at(-1)).toBe('(+2 more)');
  });
});
