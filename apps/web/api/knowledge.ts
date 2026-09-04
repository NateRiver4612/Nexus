import type {
  CreateKnowledgeItemInputType,
  CreateKnowledgeSourcesInputType,
  CreateUploadUrlInputType,
  CreateUploadUrlResponseType,
  KnowledgeSourceListType,
  UpdateKnowledgeItemInputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getKnowledge(projectId: string) {
  return handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].$get({ param: { projectId } }),
  );
}

export async function createKnowledgeItem(projectId: string, input: CreateKnowledgeItemInputType) {
  return handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].$post({ param: { projectId }, json: input }),
  );
}

export async function updateKnowledgeItem(id: string, input: UpdateKnowledgeItemInputType) {
  return handleResponse(
    await apiClient.api.v1.knowledge.items[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteKnowledgeItem(id: string) {
  return handleResponse(await apiClient.api.v1.knowledge.items[':id'].$delete({ param: { id } }));
}

export async function getKnowledgeSources(projectId: string): Promise<KnowledgeSourceListType> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources.$get({ param: { projectId } }),
  )) as KnowledgeSourceListType;
}

export async function createKnowledgeSources(
  projectId: string,
  input: CreateKnowledgeSourcesInputType,
): Promise<KnowledgeSourceListType> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources.$post({
      param: { projectId },
      json: input,
    }),
  )) as KnowledgeSourceListType;
}

export async function getKnowledgeUploadUrl(
  projectId: string,
  input: CreateUploadUrlInputType,
): Promise<CreateUploadUrlResponseType> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources['upload-url'].$post({
      param: { projectId },
      json: input,
    }),
  )) as CreateUploadUrlResponseType;
}
