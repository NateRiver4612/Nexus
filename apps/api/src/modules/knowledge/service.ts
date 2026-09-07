import { getRedis } from '../../redis';
import { getKnowledgeQueue, KNOWLEDGE_QUEUE } from '../../queues';
import { presignKnowledgePutUrl } from '../../storage';
import { embedTexts } from '../../embeddings';
import { env } from '../../env';
import { chunkText } from './chunk';
import { extractSourceText } from './extract';
import { knowledgeRepository, type NewSourceRow, type SourceRow } from './repository';
import type {
  CreateKnowledgeSourceItemType,
  CreateUploadUrlInputType,
  CreateUploadUrlResponseType,
  KnowledgeSourceType,
} from '@nexus/types';

export function KnowledgeService() {
  return {
    createSources,
    listSources,
    getUploadUrl,
    processSource,
  };
}

type CreateSourceInput = {
  projectId: string;
  userId: string;
  inputs: CreateKnowledgeSourceItemType[];
};

function mapInputToRow(
  input: CreateKnowledgeSourceItemType,
  projectId: string,
  userId: string,
): NewSourceRow {
  if (input.sourceType === 'file') {
    return {
      projectId,
      sourceType: 'file',
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: input.size,
      storageKey: input.storageKey,
      status: 'pending',
      createdBy: userId,
    };
  }

  if (input.sourceType === 'url' || input.sourceType === 'youtube') {
    return {
      projectId,
      sourceType: input.sourceType,
      name: input.url,
      sourceRef: input.url,
      status: 'pending',
      createdBy: userId,
    };
  }

  return {
    projectId,
    sourceType: 'copied_text',
    name: input.title,
    content: input.content,
    status: 'pending',
    createdBy: userId,
  };
}

export async function createSources({
  projectId,
  userId,
  inputs,
}: CreateSourceInput): Promise<KnowledgeSourceType[]> {
  const created: KnowledgeSourceType[] = [];

  for (const input of inputs) {
    const sourceRow = mapInputToRow(input, projectId, userId);
    const rows = await knowledgeRepository.insertSource(sourceRow);

    for (const row of rows) {
      await enqueueIngest(row.id);
      created.push(toSourceView(row));
    }
  }

  return created;
}

/** Enqueue the ingestion job keyed on the source so re-submits don't double-process. */
async function enqueueIngest(sourceId: string) {
  // BullMQ custom ids cannot contain ":".
  const jobId = `ingest-${sourceId}`;
  const queue = getKnowledgeQueue();
  // Allow re-processing a previously failed/ready source: drop any prior run first.
  await queue.remove(jobId);
  await queue.add(KNOWLEDGE_QUEUE, { sourceId }, { jobId, removeOnComplete: true });
}

export async function listSources(projectId: string): Promise<KnowledgeSourceType[]> {
  const rows = await knowledgeRepository.listSources(projectId);
  return rows.map(toSourceView);
}

export async function getUploadUrl(
  input: CreateUploadUrlInputType,
): Promise<CreateUploadUrlResponseType> {
  const key = `knowledge/${crypto.randomUUID()}`;
  const { url, bucket } = await presignKnowledgePutUrl(key, input.mimeType);
  return { url, key, bucket };
}

export async function processSource(sourceId: string) {
  const source = await knowledgeRepository.getSourceById(sourceId);
  if (!source) throw new Error('source not found');

  await knowledgeRepository.updateSource(sourceId, { status: 'processing', errorMessage: null });
  await publishStatus(source.projectId, sourceId, 'processing');

  try {
    const text = await extractSourceText(source);
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error('no text could be extracted');

    await knowledgeRepository.deleteChunksForSource(sourceId);

    const canEmbed = Boolean(env.OPENAI_API_KEY);
    const vectors = canEmbed ? await embedTexts(chunks) : [];

    const rows = chunks.map((content, index) => ({
      knowledgeSourceId: source.id,
      projectId: source.projectId,
      content,
      chunkIndex: index,
      metadata: {},
      embedding: canEmbed ? vectors[index] : null,
    }));

    if (rows.length > 0) {
      await knowledgeRepository.insertChunks(rows);
    }

    await knowledgeRepository.updateSource(sourceId, { status: 'ready', errorMessage: null });
    await publishStatus(source.projectId, sourceId, 'ready');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await knowledgeRepository.updateSource(sourceId, { status: 'failed', errorMessage: message });
    await publishStatus(source.projectId, sourceId, 'failed', message);
    throw error;
  }
}

function publishStatus(projectId: string, sourceId: string, status: string, errorMessage?: string) {
  const channel = `knowledge:${projectId}`;
  return getRedis().publish(
    channel,
    JSON.stringify({ sourceId, status, errorMessage: errorMessage ?? null }),
  );
}

function toSourceView(row: SourceRow): KnowledgeSourceType {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceType: row.sourceType,
    name: row.name,
    mimeType: row.mimeType ?? null,
    size: row.sizeBytes,
    sourceRef: row.sourceRef ?? null,
    storageKey: row.storageKey ?? null,
    status: row.status,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
