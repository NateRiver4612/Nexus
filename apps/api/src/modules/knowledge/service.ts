import { UnrecoverableError } from 'bullmq';
import OpenAI from 'openai';

import { presignKnowledgePutUrl } from '../../storage';
import { generateEmbeddings } from '../../embeddings';
import { env } from '../../env';
import { withUnrecoverable } from '../../queue-errors';
import { chunkText } from './chunk';
import { extractSourceText } from './extract';
import { extractFromYoutube } from './youtube';
import { KnowledgeRepository } from './repository';
import type { Db } from '@nexus/db';
import type {
  CreateKnowledgeSourceItemType,
  CreateUploadUrlInputType,
  CreateUploadUrlResponseType,
  KnowledgeSourceType,
} from '@nexus/types';
import { mapInputToRow, publishStatus, sanitizeExtractedText, toSourceView } from './helpers';
import { enqueueKnowledge, KNOWLEDGE_QUEUE_PROCESS, KNOWLEDGE_QUEUE_REMOVE } from './queues';

type CreateSourceInput = {
  projectId: string;
  userId: string;
  inputs: CreateKnowledgeSourceItemType[];
};

export function KnowledgeService(db: Db) {
  const repository = KnowledgeRepository(db);

  async function createSources(input: CreateSourceInput): Promise<KnowledgeSourceType[]> {
    const created: KnowledgeSourceType[] = [];

    for (const item of input.inputs) {
      const sourceRow = await mapInputToRow(item, input.projectId, input.userId);
      const rows = await repository.insertSource(sourceRow);

      for (const row of rows) {
        await enqueueKnowledge({
          name: KNOWLEDGE_QUEUE_PROCESS,
          jobId: `ingest-${row.id}`,
          data: {
            sourceId: row.id,
          },
          options: {
            attempts: 3,
            // Space the attempts out so transient extraction/embedding failures can clear.
            backoff: { type: 'exponential', delay: 2000 },
          },
        });
        created.push(toSourceView(row));
      }
    }

    return created;
  }

  async function listSources(projectId: string): Promise<KnowledgeSourceType[]> {
    const rows = await repository.listSources(projectId);
    return rows.map(toSourceView);
  }

  async function deleteSource(projectId: string, sourceId: string) {
    const deleted = await repository.deleteSource(sourceId, projectId);
    if (!deleted) return null;

    const storageKey = deleted.storageKey;
    if (storageKey) {
      await enqueueKnowledge({
        name: KNOWLEDGE_QUEUE_REMOVE,
        jobId: `ingest-${sourceId}-cleanup`,
        data: {
          storageKey,
        },
      });
    }

    return toSourceView(deleted);
  }

  async function getUploadUrl(
    input: CreateUploadUrlInputType,
  ): Promise<CreateUploadUrlResponseType> {
    const key = `knowledge/${input.name}`;
    const { url, bucket } = await presignKnowledgePutUrl(key, input.mimeType);
    return { url, key, bucket };
  }

  /**
   * Ingests one knowledge source end-to-end: mark it `processing`, extract text by
   * source type (YouTube transcript vs. file/url/copied text), sanitize, chunk, embed
   * when an OpenAI key is configured, then replace its chunks and mark it `ready` in a
   * single transaction so a partial run never leaves stale/mixed chunks behind.
   *
   * Failures rethrow so BullMQ can retry. The source is only marked `failed` on the
   * final attempt (`isFinalAttempt`) — marking it on every attempt made the UI flap
   * `failed` -> `processing` between retries.
   */
  async function processSource({
    sourceId,
    isFinalAttempt = true,
  }: {
    sourceId: string;
    /** False while BullMQ still has retries left, so the source keeps showing `processing`. */
    isFinalAttempt?: boolean;
  }) {
    const source = await repository.getSourceById(sourceId);
    if (!source) throw new Error('source not found');

    await repository.updateSource(sourceId, { status: 'processing', errorMessage: null });
    // Publish path: `publishStatus` writes to Redis channel `knowledge:${projectId}`, which
    // the SSE route `GET /:projectId/sources/events` (routes/index.ts) subscribes to and
    // forwards to the client as `event: source` — that's how ingestion progress reaches the UI.
    await publishStatus(source.projectId, sourceId, 'processing');

    try {
      // YouTube: fetch transcript + title together; the title becomes the
      // source name once ingestion succeeds.
      const youtube =
        source.sourceType === 'youtube' ? await extractFromYoutube(source.sourceRef) : null;
      const rawText = youtube ? youtube.content : await extractSourceText(source);
      const updatedName = youtube && youtube.title !== 'Untitled' ? youtube.title : undefined;

      const text = sanitizeExtractedText(rawText);
      const chunks = chunkText(text);
      if (chunks.length === 0) throw new UnrecoverableError('no text could be extracted');

      const canEmbed = Boolean(env.OPENAI_API_KEY);
      let vectors: number[][] = [];
      if (canEmbed) {
        // 400/401/403/404 (bad input, bad key, forbidden, missing model) won't improve on
        // retry; 429/5xx/network still will.
        vectors = await withUnrecoverable({
          promise: generateEmbeddings(chunks),
          isUnrecoverable: (error) =>
            error instanceof OpenAI.APIError && [400, 401, 403, 404].includes(error.status ?? 0),
        });
      }

      const rows = chunks.map((content, index) => ({
        knowledgeSourceId: source.id,
        projectId: source.projectId,
        content,
        chunkIndex: index,
        metadata: {},
        embedding: canEmbed ? vectors[index] : null,
      }));

      await db.transaction(async (tx) => {
        const txRepository = KnowledgeRepository(tx);
        await txRepository.deleteChunksForSource(sourceId);

        if (rows.length > 0) {
          await txRepository.insertChunks(rows);
        }

        await txRepository.updateSource(sourceId, {
          status: 'ready',
          errorMessage: null,
          ...(updatedName ? { name: updatedName } : {}),
        });
      });

      // Emit the terminal success status so the SSE stream can swap the row to `ready`.
      await publishStatus(source.projectId, sourceId, 'ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';

      // Unrecoverable errors (bad URL, missing file, unavailable source, invalid embedding
      // request, …) never succeed on retry — mark the source failed now and don't replay it.
      const permanent = error instanceof UnrecoverableError;

      if (permanent || isFinalAttempt) {
        await repository.updateSource(sourceId, { status: 'failed', errorMessage: message });
        // Emit the terminal failure (with message) so the UI can show the error.
        await publishStatus(source.projectId, sourceId, 'failed', message);
      }

      // Rethrow so BullMQ retries transient failures; permanent ones fail the job immediately.
      throw error;
    }
  }

  return { createSources, listSources, getUploadUrl, processSource, deleteSource };
}

export type KnowledgeServiceType = ReturnType<typeof KnowledgeService>;
