import type {
  AttachmentDownloadUrlType,
  AttachmentType,
  AttachmentUploadUrlResponseType,
  CreateAttachmentUploadUrlInputType,
  OkType,
} from '@nexus/types';

import { apiClient, fetchArrayBuffer, handleResponse } from '@/lib/client';

export async function createAttachmentUploadUrl(
  conversationId: string,
  input: CreateAttachmentUploadUrlInputType,
): Promise<AttachmentUploadUrlResponseType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':conversationId'].attachments['upload-url'].$post({
      param: { conversationId },
      json: input,
    }),
  )) as AttachmentUploadUrlResponseType;
}

export async function confirmAttachment(
  conversationId: string,
  attachmentId: string,
): Promise<AttachmentType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':conversationId'].attachments[
      ':attachmentId'
    ].confirm.$post({
      param: { conversationId, attachmentId },
    }),
  )) as AttachmentType;
}

export async function deleteAttachment(
  conversationId: string,
  attachmentId: string,
): Promise<OkType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':conversationId'].attachments[':attachmentId'].$delete(
      {
        param: { conversationId, attachmentId },
      },
    ),
  )) as OkType;
}

export async function getAttachmentDownloadUrl(
  conversationId: string,
  attachmentId: string,
): Promise<AttachmentDownloadUrlType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':conversationId'].attachments[':attachmentId'][
      'download-url'
    ].$get({
      param: { conversationId, attachmentId },
    }),
  )) as AttachmentDownloadUrlType;
}

/** Raw bytes for an in-app preview; downloads use the presigned URL endpoint instead. */
export async function getAttachmentFile(
  conversationId: string,
  attachmentId: string,
): Promise<ArrayBuffer> {
  return fetchArrayBuffer(
    `/api/v1/ai/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(attachmentId)}/file`,
  );
}
