import { presignKnowledgePutUrl } from '../../storage';
import { generateEmbeddings } from '../../embeddings';
import { env } from '../../env';
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
            attempts: 5,
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

  async function processSource(sourceId: string) {
    const source = await repository.getSourceById(sourceId);
    if (!source) throw new Error('source not found');

    await repository.updateSource(sourceId, { status: 'processing', errorMessage: null });
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
      if (chunks.length === 0) throw new Error('no text could be extracted');

      const canEmbed = Boolean(env.OPENAI_API_KEY);
      const vectors = canEmbed ? await generateEmbeddings(chunks) : [];

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

      await publishStatus(source.projectId, sourceId, 'ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';

      await repository.updateSource(sourceId, { status: 'failed', errorMessage: message });
      await publishStatus(source.projectId, sourceId, 'failed', message);
      throw error;
    }
  }

  return { createSources, listSources, getUploadUrl, processSource, deleteSource };
}
