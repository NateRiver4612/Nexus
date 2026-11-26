'use client';

import { useQuery } from '@tanstack/react-query';

import { getThumbnailUrl, type ThumbnailSource } from '@/api/thumbnails';

import { thumbnailKeys } from './queryKeys';

const THUMBNAIL_POLL_MS = 3000;
/** Heavy formats (Office/CSV) are queued, so poll for a while, then give up and show the icon. */
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

/**
 * Resolves a presigned thumbnail URL. Polls while the server reports `null` (thumbnail still
 * being generated) up to a bounded number of times, so non-thumbnailable files don't poll forever.
 */
export function useThumbnailUrl({
  source,
  enabled = true,
  /** Off for sources whose thumbnail is produced before the row exists (artifacts). */
  poll = true,
}: {
  source: ThumbnailSource | null;
  enabled?: boolean;
  poll?: boolean;
}) {
  return useQuery({
    queryKey: source ? keyFor(source) : thumbnailKeys.all,
    queryFn: () => getThumbnailUrl(source!),
    enabled: enabled && source !== null,
    refetchInterval: (query) => {
      if (!poll || query.state.data?.url) return false;
      return query.state.dataUpdateCount < MAX_THUMBNAIL_POLLS ? THUMBNAIL_POLL_MS : false;
    },
  });
}
