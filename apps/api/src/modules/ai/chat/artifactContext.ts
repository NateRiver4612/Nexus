import type { ArtifactListItemType } from '@nexus/types';

const MAX_ARTIFACTS = 20;

/**
 * Names only, newest first, because the model never sees artifact bodies across turns:
 * `create_artifact` keeps its reply to a short confirmation. This list is what tells the
 * model a file already exists, so it offers to show or update it instead of drafting again.
 */
export function formatConversationArtifacts(
  artifacts: Pick<ArtifactListItemType, 'name' | 'type' | 'latestVersion'>[],
) {
  if (artifacts.length === 0) return '';

  const shown = artifacts.slice(0, MAX_ARTIFACTS);
  const lines = shown.map(
    (artifact) => `- ${artifact.name} (${artifact.type}, v${artifact.latestVersion ?? 1})`,
  );

  if (artifacts.length > shown.length) {
    lines.push(`(+${artifacts.length - shown.length} more)`);
  }

  return lines.join('\n');
}
