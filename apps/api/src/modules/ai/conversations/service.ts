import type { Conversation, Db, Message } from '@nexus/db';
import type {
  ChatAttachmentType,
  ConversationType,
  MessagePageType,
  MessageType,
} from '@nexus/types';

import { ensureExists, InternalError, NotFoundError } from '../../../errors';
import { ArtifactService } from '../../artifacts/service';
import { assertProjectAccess } from '../../projects/service';
import { AttachmentRepository } from '../attachments/repository';
import { AttachmentService } from '../attachments/service';
import { ConversationRepository } from './repository';

export const DEFAULT_CONVERSATION_TITLE = 'New conversation';

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

  async function get({ id, userId }: { id: string; userId: string }): Promise<ConversationType> {
    return toConversationView(await requireOwned({ id, userId }));
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

    // The FK cascade removes the artifact and attachment rows, so collect their S3 keys first.
    const artifactService = ArtifactService(db);
    const attachmentService = AttachmentService(db);
    const [artifactKeys, attachmentKeys] = await Promise.all([
      artifactService.listStorageKeysByConversation(id),
      attachmentService.listStorageKeysByConversation(id),
    ]);

    await repository.delete({ id, userId });
    await Promise.all([
      artifactService.removeStorageObjects(artifactKeys),
      attachmentService.removeStorageObjects(attachmentKeys),
    ]);
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
    metadata,
    attachmentIds = [],
  }: {
    conversationId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sourceId?: string | null;
    metadata?: Record<string, unknown> | null;
    attachmentIds?: string[];
  }): Promise<MessageType> {
    return db.transaction(async (tx) => {
      const txRepository = ConversationRepository(tx);

      const [message] = await txRepository.appendMessage({
        conversationId,
        role,
        content,
        metadata: metadata ?? null,
        sourceId: sourceId ?? null,
      });

      const saved = ensureExists(message, InternalError('Failed to append message'));

      if (attachmentIds.length > 0) {
        // Link this message's attachments in the same transaction so a send is atomic: either
        // the message and its files both land, or neither does. The scoped update can't touch
        // another user's or another message's rows.
        await AttachmentRepository(tx).linkToMessage({
          conversationId,
          userId,
          messageId: saved.id,
          attachmentIds,
        });
      }

      await txRepository.touch({ id: conversationId, userId });

      return toMessageView(saved);
    });
  }

  async function appendUserMessage({
    conversationId,
    userId,
    content,
    attachments = [],
  }: {
    conversationId: string;
    userId: string;
    content: string;
    attachments?: ChatAttachmentType[];
  }): Promise<MessageType> {
    await requireOwned({ id: conversationId, userId });

    return appendMessage({
      conversationId,
      userId,
      role: 'user',
      content,
      // Only the chip fields are stored; the extracted text never lands in `messages.content`.
      metadata: attachments.length ? { attachments } : undefined,
      attachmentIds: attachments.map((attachment) => attachment.id),
    });
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
    metadata,
  }: {
    conversationId: string;
    userId: string;
    content: string;
    sourceId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<MessageType> {
    await requireOwned({ id: conversationId, userId });

    return appendMessage({
      conversationId,
      userId,
      role: 'assistant',
      content,
      sourceId,
      metadata,
    });
  }

  return {
    get,
    list,
    create,
    rename,
    remove,
    getMessages,
    appendUserMessage,
    appendAssistantMessage,
  };
}

export type ConversationServiceType = ReturnType<typeof ConversationService>;
