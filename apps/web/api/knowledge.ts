import type {
  CreateKnowledgeItemInputType,
  CreateKnowledgeSourcesInputType,
  CreateUploadUrlInputType,
  CreateUploadUrlResponseType,
  KnowledgeSourceDownloadUrlType,
  KnowledgeSourceListType,
  KnowledgeSourceType,
  SuccessResponse,
  UpdateKnowledgeItemInputType,
} from '@nexus/types';

import { apiClient, fetchArrayBuffer, handleResponse } from '@/lib/client';

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
    await apiClient.api.v1.knowledge[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteKnowledgeItem(id: string) {
  return handleResponse(await apiClient.api.v1.knowledge[':id'].$delete({ param: { id } }));
}

export async function getKnowledgeSources(projectId: string): Promise<KnowledgeSourceListType> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources.$get({ param: { projectId } }),
  )) as KnowledgeSourceListType;
}

export async function createKnowledgeSources(
  projectId: string,
  input: CreateKnowledgeSourcesInputType,
): Promise<SuccessResponse<KnowledgeSourceListType>> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources.$post({
      param: { projectId },
      json: input,
    }),
  )) as SuccessResponse<KnowledgeSourceListType>;
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

export async function getKnowledgeSourceDownloadUrl(
  projectId: string,
  sourceId: string,
): Promise<KnowledgeSourceDownloadUrlType> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources[':sourceId']['download-url'].$get({
      param: { projectId, sourceId },
    }),
  )) as KnowledgeSourceDownloadUrlType;
}

/** Raw bytes for an in-app preview; downloads use the presigned URL endpoint instead. */
export async function getKnowledgeSourceFile(
  projectId: string,
  sourceId: string,
): Promise<ArrayBuffer> {
  return fetchArrayBuffer(
    `/api/v1/knowledge/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(sourceId)}/file`,
  );
}

/** PDF rendering of a Word source (converted server-side with LibreOffice). */
export async function getKnowledgeSourcePreview(
  projectId: string,
  sourceId: string,
): Promise<ArrayBuffer> {
  return fetchArrayBuffer(
    `/api/v1/knowledge/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(sourceId)}/preview`,
  );
}

export async function deleteKnowledgeSource(
  projectId: string,
  sourceId: string,
): Promise<SuccessResponse<KnowledgeSourceType>> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources[':sourceId'].$delete({
      param: { projectId, sourceId },
    }),
  )) as SuccessResponse<KnowledgeSourceType>;
}

export async function deleteKnowledgeSources(
  projectId: string,
  sourceIds: string[],
): Promise<SuccessResponse<KnowledgeSourceListType>> {
  return (await handleResponse(
    await apiClient.api.v1.knowledge[':projectId'].sources.$delete({
      param: { projectId },
      json: { sourceIds },
    }),
  )) as SuccessResponse<KnowledgeSourceListType>;
}
