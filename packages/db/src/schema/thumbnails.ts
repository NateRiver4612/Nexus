import { pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { timestamps } from './columns';

export const thumbnailStatus = pgEnum('thumbnail_status', [
  'pending',
  'processing',
  'ready',
  'failed',
  'unavailable',
]);

/**
 * Generation state for a stored object's thumbnail. Keyed by `storage_key` because a
 * thumbnail is derived from the bytes: an artifact version that reuses an attachment's
 * object shares the same thumbnail, so it must share one status row too.
 */
export const thumbnails = pgTable('thumbnails', {
  storageKey: text('storage_key').primaryKey(),
  status: thumbnailStatus('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  ...timestamps,
});

export type Thumbnail = typeof thumbnails.$inferSelect;
export type NewThumbnail = typeof thumbnails.$inferInsert;
