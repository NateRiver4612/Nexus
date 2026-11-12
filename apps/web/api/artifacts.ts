import type {
  ArtifactContentType,
  CreateArtifactInputType,
  UpdateArtifactInputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getArtifacts(projectId: string) {
  return handleResponse(
    await apiClient.api.v1.artifacts[':projectId'].$get({ param: { projectId } }),
  );
}

/** One version's text plus the full version list; omitting `version` reads the newest. */
export async function getArtifactContent({
  id,
  version,
}: {
  id: string;
  version?: number;
}): Promise<ArtifactContentType> {
  return (await handleResponse(
    await apiClient.api.v1.artifacts.items[':id'].content.$get({
      param: { id },
      query: version !== undefined ? { version } : {},
    }),
  )) as ArtifactContentType;
}

export async function createArtifact(projectId: string, input: CreateArtifactInputType) {
  return handleResponse(
    await apiClient.api.v1.artifacts[':projectId'].$post({ param: { projectId }, json: input }),
  );
}

export async function updateArtifact(id: string, input: UpdateArtifactInputType) {
  return handleResponse(
    await apiClient.api.v1.artifacts.items[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteArtifact(id: string) {
  return handleResponse(await apiClient.api.v1.artifacts.items[':id'].$delete({ param: { id } }));
}
