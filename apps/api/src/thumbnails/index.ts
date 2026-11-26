import { getDb } from '@nexus/db';
import { isThumbnailableMime } from '@nexus/shared-helpers';

import { deleteObject, getObject, getObjectSize, presignInlineUrl, putObject } from '../storage';

import { generateThumbnail } from './generate';
import { ThumbnailRepository, type ThumbnailStatusType } from './repository';

export { isThumbnailableMime };

export type ThumbnailResult = { url: string | null; status: ThumbnailStatusType };

function repository() {
  return ThumbnailRepository(getDb());
}

/** Derived from the source key, so a shared attachment/artifact object shares one thumbnail. */
function thumbKeyFor(storageKey: string): string {
  return `thumbnails/${storageKey}.webp`;
}

/**
 * Generates and stores a thumbnail for one stored object. Callers pass `body` when they already
 * have the bytes; otherwise they're fetched from storage (the thumbnail worker path).
 */
export async function ensureThumbnail({
  storageKey,
  mimeType,
  name,
  body,
}: {
  storageKey: string;
  mimeType: string;
  name: string;
  body?: Buffer;
}): Promise<string | null> {
  if (!isThumbnailableMime(mimeType)) return null;

  const thumbnails = repository();
  await thumbnails.processing(storageKey);

  try {
    const source = body ?? (await getObject(storageKey)).body;
    const thumbnail = await generateThumbnail({ body: source, mimeType, name });
    if (!thumbnail) {
      await thumbnails.failed(storageKey, 'No thumbnail could be generated.');
      return null;
    }

    const key = thumbKeyFor(storageKey);
    await putObject(key, thumbnail, 'image/webp');
    await thumbnails.ready(storageKey);
    return key;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Thumbnail generation failed.';
    // Best-effort: failing to record the status must not mask the generation error.
    await thumbnails.failed(storageKey, message).catch(() => undefined);
    throw error;
  }
}

/**
 * Presigned inline URL for a stored thumbnail plus its generation status. The status lets the
 * client tell "still generating" from "generation failed" instead of inferring from a timeout.
 */
export async function getThumbnailUrl(storageKey: string): Promise<ThumbnailResult> {
  const thumbnails = repository();
  const row = await thumbnails.get(storageKey);

  if (row?.status === 'ready') {
    const url = await presignInlineUrl({ key: thumbKeyFor(storageKey) });
    return { url: url.url, status: 'ready' };
  }
  if (row?.status === 'failed' || row?.status === 'unavailable') {
    return { url: null, status: row.status };
  }
  if (row) return { url: null, status: row.status };

  // Legacy: a thumbnail may exist from before status rows were tracked. Backfill it lazily.
  const size = await getObjectSize(thumbKeyFor(storageKey));
  if (size === null) return { url: null, status: 'pending' };

  await thumbnails.ready(storageKey).catch(() => undefined);
  const url = await presignInlineUrl({ key: thumbKeyFor(storageKey) });
  return { url: url.url, status: 'ready' };
}

/** Best-effort cleanup for a stored object's thumbnail (object + status row). */
export async function deleteThumbnail(storageKey: string): Promise<void> {
  const key = thumbKeyFor(storageKey);
  try {
    await deleteObject(key);
  } catch (error) {
    console.warn(`[thumbnails] could not delete thumbnail for ${storageKey}`, error);
  }

  try {
    await repository().remove(storageKey);
  } catch (error) {
    // A leftover row costs nothing and must not block the object deletion.
    console.warn(`[thumbnails] could not delete status for ${storageKey}`, error);
  }
}
