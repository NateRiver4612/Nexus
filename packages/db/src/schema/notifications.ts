import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { idColumn } from './columns';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: idColumn(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 48 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message'),
    resourceType: varchar('resource_type', { length: 48 }),
    resourceId: uuid('resource_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notifications_user_idx').on(table.userId, table.readAt)],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
