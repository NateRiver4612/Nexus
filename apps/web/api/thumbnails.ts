import type { ThumbnailUrlType } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export type ThumbnailSource =
  | { kind: 'knowledge'; projectId: string; sourceId: string }
  | { kind: 'attachment'; conversationId: string; attachmentId: string }
  | { kind: 'artifact'; artifactId: string; version?: number };

/** Presigned inline thumbnail URL, or null while the server hasn't generated one yet. */
export async function getThumbnailUrl(source: ThumbnailSource): Promise<ThumbnailUrlType> {
  switch (source.kind) {
    case 'knowledge':
      return (await handleResponse(
        await apiClient.api.v1.knowledge[':projectId'].sources[':sourceId']['thumbnail-url'].$get({
          param: { projectId: source.projectId, sourceId: source.sourceId },
        }),
      )) as ThumbnailUrlType;

    case 'attachment':
      return (await handleResponse(
        await apiClient.api.v1.ai.conversations[':conversationId'].attachments[':attachmentId'][
          'thumbnail-url'
        ].$get({
          param: {
            conversationId: source.conversationId,
            attachmentId: source.attachmentId,
          },
        }),
      )) as ThumbnailUrlType;

    case 'artifact':
      return (await handleResponse(
        await apiClient.api.v1.artifacts[':id']['thumbnail-url'].$get({
          param: { id: source.artifactId },
          query: source.version !== undefined ? { version: source.version } : {},
        }),
      )) as ThumbnailUrlType;
  }
}
