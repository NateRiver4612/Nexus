import { Worker } from 'bullmq';

import { getRedis } from '../redis';
import { onComplete, onFailed } from '../startWorkers';
import { ensureThumbnail } from './index';
import { THUMBNAIL_QUEUE, type ThumbnailJob } from './queue';

const ThumbnailWorker = () => {
  const thumbnailWorker = new Worker<ThumbnailJob>(
    THUMBNAIL_QUEUE,
    async (job) => {
      const { storageKey, mimeType, name } = job.data;
      console.log(`[worker] thumbnail ${job.id} key=${storageKey} start`);
      // Heavy formats (LibreOffice via Gotenberg, PDF rendering) keep concurrency low.
      await ensureThumbnail({ storageKey, mimeType, name });
    },
    { connection: getRedis(), concurrency: 2 },
  );

  thumbnailWorker.on('completed', onComplete);
  thumbnailWorker.on('failed', onFailed);

  return thumbnailWorker;
};

export default ThumbnailWorker;
