import { and, desc, eq, lt } from 'drizzle-orm';

import { conversations, messages, type Db, type NewMessage } from '@nexus/db';

export const ConversationRepository = (db: Db) => ({
  list({ projectId, userId }: { projectId: string; userId: string }) {
    return db
      .select()
      .from(conversations)
      .where(and(eq(conversations.projectId, projectId), eq(conversations.userId, userId)))
      .orderBy(desc(conversations.updatedAt));
  },

  create({ projectId, userId, title }: { projectId: string; userId: string; title: string }) {
    return db.insert(conversations).values({ projectId, userId, title }).returning();
  },

  /** Owned lookup — a non-owner gets `undefined`, never a row. */
  async getOwned({ id, userId }: { id: string; userId: string }) {
    const rows = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .limit(1);
    return rows[0];
  },

  rename({ id, userId, title }: { id: string; userId: string; title: string }) {
    return db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
  },

  touch({ id, userId }: { id: string; userId: string }) {
    return db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
  },

  delete({ id, userId }: { id: string; userId: string }) {
    return db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
  },

  /**
   * Newest-first page. The join re-checks ownership, and `limit + 1` lets the
   * service tell whether an older page exists without a second query.
   */
  listMessages({
    conversationId,
    userId,
    limit,
    cursor,
  }: {
    conversationId: string;
    userId: string;
    limit: number;
    cursor?: number;
  }) {
    return db
      .select({ message: messages })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(conversations.userId, userId),
          cursor ? lt(messages.seq, cursor) : undefined,
        ),
      )
      .orderBy(desc(messages.seq))
      .limit(limit + 1);
  },

  appendMessage(values: NewMessage) {
    return db.insert(messages).values(values).returning();
  },
});
