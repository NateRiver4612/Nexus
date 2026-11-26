import type { ArtifactListType, ArtifactRefType } from '@nexus/types';
import { artifactTypeSchema } from '@nexus/zod-schemas';

/** Slim API rows to the panel/message shape, dropping any artifact whose type we don't render. */
export function toArtifactRefs(artifacts: ArtifactListType): ArtifactRefType[] {
  return artifacts.flatMap((artifact) => {
    const type = artifactTypeSchema.safeParse(artifact.type);
    if (!type.success) return [];
    return [
      {
        id: artifact.id,
        name: artifact.name,
        type: type.data,
        version: artifact.latestVersion ?? 1,
      },
    ];
  });
}
