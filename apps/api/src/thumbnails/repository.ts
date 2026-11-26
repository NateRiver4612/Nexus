import { eq } from 'drizzle-orm';

import { thumbnails, type Db, type Thumbnail } from '@nexus/db';

export type ThumbnailStatusType = Thumbnail['status'];

/** Persists thumbnail generation state, keyed by the storage object it is derived from. */
export function ThumbnailRepository(db: Db) {
  async function get(storageKey: string): Promise<Thumbnail | undefined> {
    const [row] = await db
      .select()
      .from(thumbnails)
      .where(eq(thumbnails.storageKey, storageKey))
      .limit(1);
    return row;
  }

  async function setStatus(
    storageKey: string,
    status: ThumbnailStatusType,
    errorMessage: string | null = null,
  ) {
    await db
      .insert(thumbnails)
      .values({ storageKey, status, errorMessage })
      .onConflictDoUpdate({
        target: thumbnails.storageKey,
        set: { status, errorMessage, updatedAt: new Date() },
      });
  }

  async function remove(storageKey: string) {
    await db.delete(thumbnails).where(eq(thumbnails.storageKey, storageKey));
  }

  return {
    get,
    remove,
    pending: (storageKey: string) => setStatus(storageKey, 'pending'),
    processing: (storageKey: string) => setStatus(storageKey, 'processing'),
    ready: (storageKey: string) => setStatus(storageKey, 'ready'),
    unavailable: (storageKey: string) => setStatus(storageKey, 'unavailable'),
    failed: (storageKey: string, message: string) => setStatus(storageKey, 'failed', message),
  };
}

export type ThumbnailRepositoryType = ReturnType<typeof ThumbnailRepository>;
