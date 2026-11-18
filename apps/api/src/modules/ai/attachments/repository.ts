import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  conversationAttachments,
  type Db,
  type NewConversationAttachment,
} from '@nexus/db';

export const AttachmentRepository = (db: Db) => ({
  async getById(id: string) {
    const rows = await db
      .select()
      .from(conversationAttachments)
      .where(eq(conversationAttachments.id, id))
      .limit(1);
    return rows[0];
  },

  async listByIds(ids: string[]) {
    return db
      .select()
      .from(conversationAttachments)
      .where(inArray(conversationAttachments.id, ids));
  },

  /** Newest match by filename within a conversation; the model supplies the name. */
  async findByConversationAndName({
    conversationId,
    name,
  }: {
    conversationId: string;
    name: string;
  }) {
    const rows = await db
      .select()
      .from(conversationAttachments)
      .where(
        and(
          eq(conversationAttachments.conversationId, conversationId),
          sql`lower(${conversationAttachments.name}) = lower(${name})`,
        ),
      )
      .orderBy(desc(conversationAttachments.createdAt))
      .limit(1);
    return rows[0];
  },

  /**
   * Links confirmed attachments to a message. The where-clause re-checks ownership, readiness
   * and that the attachment is still unattached, so a concurrent send can never steal a file.
   */
  async linkToMessage({
    conversationId,
    userId,
    messageId,
    attachmentIds,
  }: {
    conversationId: string;
    userId: string;
    messageId: string;
    attachmentIds: string[];
  }) {
    return db
      .update(conversationAttachments)
      .set({ messageId })
      .where(
        and(
          inArray(conversationAttachments.id, attachmentIds),
          eq(conversationAttachments.conversationId, conversationId),
          eq(conversationAttachments.userId, userId),
          eq(conversationAttachments.status, 'ready'),
          isNull(conversationAttachments.messageId),
        ),
      )
      .returning();
  },

  insert(values: NewConversationAttachment) {
    return db.insert(conversationAttachments).values(values).returning();
  },

  async update(id: string, patch: Partial<NewConversationAttachment>) {
    return (
      await db
        .update(conversationAttachments)
        .set(patch)
        .where(eq(conversationAttachments.id, id))
        .returning()
    )[0];
  },

  async delete(id: string) {
    return (
      await db
        .delete(conversationAttachments)
        .where(eq(conversationAttachments.id, id))
        .returning()
    )[0];
  },

  async listStorageKeysByConversation(conversationId: string) {
    const rows = await db
      .select({ storageKey: conversationAttachments.storageKey })
      .from(conversationAttachments)
      .where(eq(conversationAttachments.conversationId, conversationId));
    return rows.map((row) => row.storageKey);
  },
});
