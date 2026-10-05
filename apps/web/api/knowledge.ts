import type { CreateKnowledgeItemInput, UpdateKnowledgeItemInput } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getKnowledge(projectId: string) {
  return handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].$get({ param: { projectId } }),
  );
}

export async function createKnowledgeItem(projectId: string, input: CreateKnowledgeItemInput) {
  return handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].$post({ param: { projectId }, json: input }),
  );
}

export async function updateKnowledgeItem(id: string, input: UpdateKnowledgeItemInput) {
  return handleResponse(
    await apiClient.api.v1.knowledge.items[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteKnowledgeItem(id: string) {
  return handleResponse(await apiClient.api.v1.knowledge.items[':id'].$delete({ param: { id } }));
}
