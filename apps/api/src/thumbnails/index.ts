import { isThumbnailableMime } from '@nexus/shared-helpers';

import { deleteObject, getObject, getObjectSize, presignInlineUrl, putObject } from '../storage';

import { generateThumbnail } from './generate';

export { isThumbnailableMime };

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

  const source = body ?? (await getObject(storageKey)).body;
  const thumbnail = await generateThumbnail({ body: source, mimeType, name });
  if (!thumbnail) return null;

  const key = thumbKeyFor(storageKey);
  await putObject(key, thumbnail, 'image/webp');
  return key;
}

/**
 * Presigned inline URL for a stored thumbnail, or null while it hasn't been generated yet. The
 * client renders the URL directly and falls back to a file icon when this returns null.
 */
export async function getThumbnailUrl(storageKey: string): Promise<{ url: string } | null> {
  const key = thumbKeyFor(storageKey);
  const size = await getObjectSize(key);
  if (size === null) return null;

  return presignInlineUrl({ key });
}

/** Best-effort cleanup for a stored object's thumbnail. */
export async function deleteThumbnail(storageKey: string): Promise<void> {
  const key = thumbKeyFor(storageKey);
  try {
    await deleteObject(key);
  } catch (error) {
    console.warn(`[thumbnails] could not delete thumbnail for ${storageKey}`, error);
  }
}
