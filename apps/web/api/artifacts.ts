import type { CreateArtifactInput, UpdateArtifactInput } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function listArtifacts(projectId: string) {
  return handleResponse(
    await apiClient.api.v1.artifacts[':projectId'].$get({ param: { projectId } }),
  );
}

export async function createArtifact(projectId: string, input: CreateArtifactInput) {
  return handleResponse(
    await apiClient.api.v1.artifacts[':projectId'].$post({ param: { projectId }, json: input }),
  );
}

export async function updateArtifact(id: string, input: UpdateArtifactInput) {
  return handleResponse(
    await apiClient.api.v1.artifacts.items[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteArtifact(id: string) {
  return handleResponse(await apiClient.api.v1.artifacts.items[':id'].$delete({ param: { id } }));
}
