import { type JobsOptions } from 'bullmq';

import { getQueue } from '../lib/getQueue';

export type ThumbnailJob = { storageKey: string; mimeType: string; name: string };

export const THUMBNAIL_QUEUE = 'thumbnail';

export function getThumbnailQueue() {
  return getQueue<ThumbnailJob>(THUMBNAIL_QUEUE);
}

/** Deduped per storage object so re-upload/retry doesn't stack duplicate conversions. */
export async function enqueueThumbnail({
  storageKey,
  mimeType,
  name,
  options,
}: ThumbnailJob & { options?: JobsOptions }) {
  const queue = getThumbnailQueue();
  const jobId = `thumb-${storageKey}`;

  await queue.remove(jobId);
  await queue.add(
    'thumbnail',
    { storageKey, mimeType, name },
    {
      removeOnComplete: true,
      removeOnFail: { count: 1000 },
      ...options,
      jobId,
    },
  );
}
