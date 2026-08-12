import { timestamp, uuid } from 'drizzle-orm/pg-core';

export function idColumn() {
  return uuid('id').defaultRandom().primaryKey();
}

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
