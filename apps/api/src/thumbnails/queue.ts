import { type JobsOptions } from 'bullmq';

import { getDb } from '@nexus/db';
import { isThumbnailableMime } from '@nexus/shared-helpers';

import { getQueue } from '../lib/getQueue';
import { ThumbnailRepository } from './repository';

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
  const repository = ThumbnailRepository(getDb());

  // Nothing to generate — record it so the client shows an icon instead of polling forever.
  if (!isThumbnailableMime(mimeType)) {
    await repository.unavailable(storageKey);
    return;
  }

  const queue = getThumbnailQueue();
  const jobId = `thumb-${storageKey}`;

  // Status rows outlive jobs. A previous `failed`/`ready` would leave the client no longer
  // polling, so the fresh job below would run invisibly. Reset to `pending` (and drop the old
  // job) so a re-upload/retry both re-runs and stays visible to the UI.
  await repository.pending(storageKey);

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
