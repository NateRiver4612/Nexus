import type {
  ArtifactContentType,
  ArtifactDownloadUrlType,
  ArtifactListType,
  UpdateArtifactInputType,
} from '@nexus/types';

import { apiClient, fetchArrayBuffer, handleResponse } from '@/lib/client';

export async function getArtifacts(
  projectId: string,
  conversationId?: string,
): Promise<ArtifactListType> {
  return (await handleResponse(
    await apiClient.api.v1.artifacts[':projectId'].$get({
      param: { projectId },
      query: conversationId ? { conversationId } : {},
    }),
  )) as ArtifactListType;
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
    await apiClient.api.v1.artifacts[':id'].content.$get({
      param: { id },
      query: version !== undefined ? { version } : {},
    }),
  )) as ArtifactContentType;
}

/** Raw bytes for an in-app preview, mirroring the attachment file endpoint. */
export async function getArtifactFile({
  id,
  version,
}: {
  id: string;
  version?: number;
}): Promise<ArrayBuffer> {
  const query = version !== undefined ? `?version=${version}` : '';
  return fetchArrayBuffer(`/api/v1/artifacts/${encodeURIComponent(id)}/file${query}`);
}

export async function getArtifactDownloadUrl({
  id,
  version,
}: {
  id: string;
  version?: number;
}): Promise<ArtifactDownloadUrlType> {
  return (await handleResponse(
    await apiClient.api.v1.artifacts[':id']['download-url'].$get({
      param: { id },
      query: version !== undefined ? { version } : {},
    }),
  )) as ArtifactDownloadUrlType;
}

export async function updateArtifact(id: string, input: UpdateArtifactInputType) {
  return handleResponse(
    await apiClient.api.v1.artifacts[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteArtifact(id: string) {
  return handleResponse(await apiClient.api.v1.artifacts[':id'].$delete({ param: { id } }));
}
