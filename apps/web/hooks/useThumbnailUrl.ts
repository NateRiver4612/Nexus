'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getThumbnailUrl, type ThumbnailSource } from '@/api/thumbnails';

import { thumbnailKeys } from './queryKeys';

const THUMBNAIL_POLL_MS = 3000;
/** Safety cap for a row stuck in `pending` (e.g. a lost job), then show the icon. */
const MAX_THUMBNAIL_POLLS = 10;

function keyFor(source: ThumbnailSource) {
  switch (source.kind) {
    case 'knowledge':
      return thumbnailKeys.knowledge(source.projectId, source.sourceId);
    case 'attachment':
      return thumbnailKeys.attachment(source.conversationId, source.attachmentId);
    case 'artifact':
      return thumbnailKeys.artifact(source.artifactId, source.version);
  }
}

/** UI-facing state derived from the persisted server status. */
export type ThumbnailStatus = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Resolves a presigned thumbnail URL and polls while the server reports it is still being
 * generated. The server persists `pending`/`processing`/`ready`/`failed`/`unavailable`, so
 * a genuine failure falls back to the icon instead of waiting for a timeout.
 */
export function useThumbnailUrl({
  source,
  enabled = true,
}: {
  source: ThumbnailSource | null;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = source ? keyFor(source) : thumbnailKeys.all;
  const query = useQuery({
    queryKey,
    queryFn: () => getThumbnailUrl(source!),
    enabled: enabled && source !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === 'ready' ||
        status === 'failed' ||
        status === 'unavailable' ||
        query.state.status === 'error'
      ) {
        return false;
      }
      return query.state.dataUpdateCount < MAX_THUMBNAIL_POLLS ? THUMBNAIL_POLL_MS : false;
    },
  });
  const dataUpdateCount = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;

  let status: ThumbnailStatus;
  if (!enabled || source === null) {
    status = 'idle';
  } else if (query.isError) {
    status = 'failed';
  } else if (query.data?.status === 'ready') {
    status = 'ready';
  } else if (query.data?.status === 'failed' || query.data?.status === 'unavailable') {
    status = 'failed';
  } else if (query.data?.status === 'pending' || query.data?.status === 'processing') {
    // Safety cap in case a row gets stuck (e.g. the job was lost).
    status = dataUpdateCount < MAX_THUMBNAIL_POLLS ? 'loading' : 'failed';
  } else {
    // First request in flight.
    status = 'loading';
  }

  return { ...query, status };
}
