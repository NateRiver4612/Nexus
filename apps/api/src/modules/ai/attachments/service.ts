import { randomUUID } from 'node:crypto';

import type { ConversationAttachment, Db } from '@nexus/db';
import type { AttachmentType } from '@nexus/types';
import { MAX_FILE_SIZE } from '@nexus/zod-schemas/constants';

import {
  ConflictError,
  ensure,
  ensureExists,
  NotFoundError,
  ValidationError,
} from '../../../errors';
import { deleteObject, getObjectSize, presignGetUrl, presignPutUrl } from '../../../storage';
import {
  extractAudioFromBuffer,
  extractFromBuffer,
  fetchStoredObject,
} from '../../knowledge/extract';
import { sanitizeExtractedText } from '../../knowledge/helpers';
import { ConversationService } from '../conversations/service';
import { AttachmentRepository } from './repository';

function toView(row: ConversationAttachment): AttachmentType {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
    status: row.status,
    errorMessage: row.errorMessage ?? null,
  };
}

export function AttachmentService(db: Db) {
  const repository = AttachmentRepository(db);
  const conversations = ConversationService(db);

  /**
   * The attachment must belong to a conversation the user owns and can access. Missing or
   * foreign rows and inaccessible projects all 404, matching `ConversationService.requireOwned`.
   */
  async function requireOwned({
    conversationId,
    attachmentId,
    userId,
  }: {
    conversationId: string;
    attachmentId: string;
    userId: string;
  }) {
    await conversations.get({ id: conversationId, userId });

    const attachment = ensureExists(
      await repository.getById(attachmentId),
      NotFoundError('Attachment not found.'),
    );
    ensure(attachment.conversationId === conversationId, NotFoundError('Attachment not found.'));
    ensure(attachment.userId === userId, NotFoundError('Attachment not found.'));

    return attachment;
  }

  async function createUploadUrl({
    conversationId,
    userId,
    name,
    mimeType,
    size,
  }: {
    conversationId: string;
    userId: string;
    name: string;
    mimeType: string;
    size: number;
  }): Promise<{ attachmentId: string; url: string }> {
    const conversation = await conversations.get({ id: conversationId, userId });

    // Server-generated key: knowledge's `knowledge/${name}` key collides and skips access
    // checks, so chat attachments get their own namespaced, collision-free path.
    const storageKey = `chat/${conversation.projectId}/${conversationId}/${randomUUID()}`;
    const { url } = await presignPutUrl(storageKey, mimeType);

    const [row] = await repository.insert({
      conversationId,
      userId,
      name,
      mimeType,
      size,
      storageKey,
      status: 'uploaded',
    });

    return {
      attachmentId: ensureExists(row, NotFoundError('Attachment not found.')).id,
      url,
    };
  }

  /**
   * Verifies the stored object and extracts its text. Runs after the browser's presigned PUT,
   * so the user sees `ready`/`failed` before sending. Extraction failures mark the row `failed`
   * with a message rather than throwing — a scanned PDF or corrupt file is an expected outcome.
   */
  async function confirm({
    conversationId,
    attachmentId,
    userId,
  }: {
    conversationId: string;
    attachmentId: string;
    userId: string;
  }): Promise<AttachmentType> {
    const attachment = await requireOwned({ conversationId, attachmentId, userId });

    await repository.update(attachmentId, { status: 'processing', errorMessage: null });

    try {
      const realSize = await getObjectSize(attachment.storageKey);
      if (realSize === null) throw new Error('The uploaded file could not be found.');
      if (realSize > MAX_FILE_SIZE) {
        // Presigned PUT does not enforce the declared size, so an oversize object is dropped.
        await discardObject(attachment.storageKey);
        throw new Error('File exceeds the 25 MB limit.');
      }

      const { body } = await fetchStoredObject(attachment.storageKey);
      const isAudio = attachment.mimeType.startsWith('audio/');
      const rawText = isAudio
        ? await extractAudioFromBuffer({
            body,
            name: attachment.name,
            mimeType: attachment.mimeType,
          })
        : await extractFromBuffer({ body, mime: attachment.mimeType });
      const text = sanitizeExtractedText(rawText);

      if (!text.trim()) {
        throw new Error(
          isAudio ? 'No speech was detected in the audio.' : 'No text could be extracted.',
        );
      }

      await repository.update(attachmentId, {
        status: 'ready',
        extractedText: text,
        errorMessage: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read the file.';
      await repository.update(attachmentId, { status: 'failed', errorMessage: message });
    }

    return toView(
      ensureExists(await repository.getById(attachmentId), NotFoundError('Attachment not found.')),
    );
  }

  async function remove({
    conversationId,
    attachmentId,
    userId,
  }: {
    conversationId: string;
    attachmentId: string;
    userId: string;
  }) {
    const attachment = await requireOwned({ conversationId, attachmentId, userId });

    // Once attached to a message it's part of the thread; only the conversation delete cascades it.
    ensure(
      attachment.messageId === null,
      ConflictError('This attachment is already part of a message.'),
    );

    await repository.delete(attachmentId);
    await discardObject(attachment.storageKey);
  }

  async function getDownloadUrl({
    conversationId,
    attachmentId,
    userId,
  }: {
    conversationId: string;
    attachmentId: string;
    userId: string;
  }) {
    const attachment = await requireOwned({ conversationId, attachmentId, userId });

    return presignGetUrl({ key: attachment.storageKey, filename: attachment.name });
  }

  /**
   * Loads the attachments for a send and rejects anything that isn't ready, isn't in this
   * conversation/user's scope, or is already attached to a message. Returns the full rows so
   * the caller can build the inline context from `extractedText`.
   */
  async function listReadyForSend({
    conversationId,
    userId,
    attachmentIds,
  }: {
    conversationId: string;
    userId: string;
    attachmentIds: string[];
  }): Promise<ConversationAttachment[]> {
    await conversations.get({ id: conversationId, userId });

    if (attachmentIds.length === 0) return [];

    const rows = await repository.listByIds(attachmentIds);
    ensure(rows.length === attachmentIds.length, NotFoundError('Attachment not found.'));

    for (const row of rows) {
      ensure(
        row.conversationId === conversationId && row.userId === userId,
        NotFoundError('Attachment not found.'),
      );
      ensure(row.status === 'ready', ValidationError(`"${row.name}" is not ready yet.`));
      ensure(
        row.messageId === null,
        ConflictError(`"${row.name}" is already attached to a message.`),
      );
    }

    return rows;
  }

  /** Character counts of already-sent attachments, used to stub them in later turns. */
  async function getCharCounts({
    conversationId,
    userId,
    ids,
  }: {
    conversationId: string;
    userId: string;
    ids: string[];
  }): Promise<Map<string, number>> {
    await conversations.get({ id: conversationId, userId });

    if (ids.length === 0) return new Map();

    const rows = await repository.listByIds(ids);
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.conversationId === conversationId) {
        counts.set(row.id, row.extractedText?.length ?? 0);
      }
    }
    return counts;
  }

  /** Chat lookup by filename, scoped to the conversation the caller already verified. */
  async function findByName({ conversationId, name }: { conversationId: string; name: string }) {
    return repository.findByConversationAndName({ conversationId, name });
  }

  /** Fetched before conversation deletion, while the attachment rows still exist. */
  async function listStorageKeysByConversation(conversationId: string) {
    return repository.listStorageKeysByConversation(conversationId);
  }

  /** Best-effort; a failed S3 delete must not block the conversation deletion. */
  async function removeStorageObjects(storageKeys: string[]) {
    await Promise.all(storageKeys.map((key) => discardObject(key)));
  }

  return {
    createUploadUrl,
    confirm,
    remove,
    getDownloadUrl,
    listReadyForSend,
    getCharCounts,
    findByName,
    listStorageKeysByConversation,
    removeStorageObjects,
  };
}

export type AttachmentServiceType = ReturnType<typeof AttachmentService>;

async function discardObject(key: string) {
  try {
    await deleteObject(key);
  } catch (error) {
    // Best-effort: a leftover object costs storage only, and must not mask the real outcome.
    console.warn(`[attachments] could not delete S3 object ${key}`, error);
  }
}
