import type { Conversation, Db, Message } from '@nexus/db';
import type { ConversationType, MessagePageType, MessageType } from '@nexus/types';

import { ensureExists, InternalError, NotFoundError } from '../../../errors';
import { assertProjectAccess } from '../../projects/service';
import { ConversationRepository } from './repository';

function toConversationView(row: Conversation): ConversationType {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessageView(row: Message): MessageType {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    sourceId: row.sourceId ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function ConversationService(db: Db) {
  const repository = ConversationRepository(db);

  /**
   * Loads a conversation only when the current user owns it, then re-checks
   * project access. Missing/foreign rows and inaccessible projects both 404.
   */
  async function requireOwned({ id, userId }: { id: string; userId: string }) {
    const conversation = ensureExists(
      await repository.getOwned({ id, userId }),
      NotFoundError('Conversation not found'),
    );

    await assertProjectAccess(db, userId, conversation.projectId);
    return conversation;
  }

  async function list({
    projectId,
    userId,
  }: {
    projectId: string;
    userId: string;
  }): Promise<ConversationType[]> {
    await assertProjectAccess(db, userId, projectId);

    const rows = await repository.list({ projectId, userId });
    return rows.map(toConversationView);
  }

  async function create({
    projectId,
    userId,
    title,
  }: {
    projectId: string;
    userId: string;
    title: string;
  }): Promise<ConversationType> {
    await assertProjectAccess(db, userId, projectId);

    const [row] = await repository.create({ projectId, userId, title });
    return toConversationView(ensureExists(row, InternalError('Failed to create conversation')));
  }

  async function rename({
    id,
    userId,
    title,
  }: {
    id: string;
    userId: string;
    title: string;
  }): Promise<ConversationType> {
    await requireOwned({ id, userId });

    const [row] = await repository.rename({ id, userId, title });
    return toConversationView(ensureExists(row, NotFoundError('Conversation not found')));
  }

  async function remove({ id, userId }: { id: string; userId: string }) {
    await requireOwned({ id, userId });
    await repository.delete({ id, userId });
  }

  async function getMessages({
    conversationId,
    userId,
    limit,
    cursor,
  }: {
    conversationId: string;
    userId: string;
    limit: number;
    cursor?: number;
  }): Promise<MessagePageType> {
    await requireOwned({ id: conversationId, userId });

    const rows = await repository.listMessages({ conversationId, userId, limit, cursor });
    const hasMore = rows.length > limit;
    const paginatedMessages = (hasMore ? rows.slice(0, limit) : rows).map(({ message }) => message);
    const oldest = paginatedMessages.at(-1);

    return {
      messages: [...paginatedMessages].reverse().map(toMessageView),
      hasMore,
      nextCursor: hasMore && oldest ? oldest.seq : null,
    };
  }

  async function appendMessage({
    conversationId,
    userId,
    role,
    content,
    sourceId,
  }: {
    conversationId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sourceId?: string | null;
  }): Promise<MessageType> {
    return db.transaction(async (tx) => {
      const txRepository = ConversationRepository(tx);

      const [message] = await txRepository.appendMessage({
        conversationId,
        role,
        content,
        sourceId: sourceId ?? null,
      });

      await txRepository.touch({ id: conversationId, userId });

      return toMessageView(ensureExists(message, InternalError('Failed to append message')));
    });
  }

  async function appendUserMessage({
    conversationId,
    userId,
    content,
  }: {
    conversationId: string;
    userId: string;
    content: string;
  }): Promise<MessageType> {
    await requireOwned({ id: conversationId, userId });

    return appendMessage({ conversationId, userId, role: 'user', content });
  }

  /**
   * Internal append for the assistant turn (Step 3). Kept off the route layer:
   * callers already hold the conversation and must pass the owning user.
   */
  async function appendAssistantMessage({
    conversationId,
    userId,
    content,
    sourceId,
  }: {
    conversationId: string;
    userId: string;
    content: string;
    sourceId?: string | null;
  }): Promise<MessageType> {
    await requireOwned({ id: conversationId, userId });

    return appendMessage({ conversationId, userId, role: 'assistant', content, sourceId });
  }

  return {
    list,
    create,
    rename,
    remove,
    getMessages,
    appendUserMessage,
    appendAssistantMessage,
  };
}
