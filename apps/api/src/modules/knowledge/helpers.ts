import { isYouTubeUrl } from '@nexus/shared-helpers';

import type { CreateKnowledgeSourceItemType, KnowledgeSourceType } from '@nexus/types';
import type { NewSourceRow, SourceRow } from './repository';
import { getRedis } from '../../redis';

export async function mapInputToRow(
  input: CreateKnowledgeSourceItemType,
  projectId: string,
  userId: string,
): Promise<NewSourceRow> {
  // Audio uploads go through the same presigned-S3 flow as files; only extraction differs.
  if (input.sourceType === 'file' || input.sourceType === 'audio') {
    return {
      projectId,
      sourceType: input.sourceType,
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
      name:
        input.sourceType === 'youtube' ? `YouTubeURL (${input.url})` : `UnknownURL (${input.url})`,
      sourceType: input.sourceType,
      sourceRef: input.url,
      status: 'pending',
      createdBy: userId,
    };
  }

  return {
    projectId,
    sourceType: 'copied_text',
    mimeType: 'text',
    name: input.textTitle,
    content: input.textContent,
    status: 'pending',
    createdBy: userId,
  };
}

/**
 * Publishes an ingestion status update to the project's Redis pub/sub channel
 * (`knowledge:${projectId}`). Consumed by the SSE route
 * `GET /api/v1/knowledge/:projectId/sources/events` (routes/index.ts), which forwards
 * each message to the client as `event: source`. Called from `KnowledgeService.processSource`.
 */
export function publishStatus(
  projectId: string,
  sourceId: string,
  status: string,
  errorMessage?: string,
) {
  const channel = `knowledge:${projectId}`;
  return getRedis().publish(
    channel,
    JSON.stringify({ sourceId, status, errorMessage: errorMessage ?? null }),
  );
}

const PREVIEW_CONTENT_MAX_CHARS = 50_000;

/**
 * The list endpoint carries `content` for the preview dialog. Trim it so a large
 * PDF/URL doesn't bloat every list response — the full text stays in the DB.
 */
function truncatePreviewContent(content: string | null): string | null {
  if (!content || content.length <= PREVIEW_CONTENT_MAX_CHARS) return content;
  return `${content.slice(0, PREVIEW_CONTENT_MAX_CHARS)}\n\n…`;
}

export function toSourceView(row: SourceRow): KnowledgeSourceType {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceType: row.sourceType,
    name: row.name,
    mimeType: row.mimeType,
    size: row.sizeBytes,
    sourceRef: row.sourceRef ?? null,
    storageKey: row.storageKey ?? null,
    status: row.status,
    errorMessage: row.errorMessage ?? null,
    content: truncatePreviewContent(row.content ?? null),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function sanitizeExtractedText(text: string): string {
  return text.replace(/\u0000/g, '');
}

export function cleanTitle(title: string, url: string): string {
  const cleaned = title.trim();
  if (isYouTubeUrl(url)) {
    return cleaned.replace(/\s*-\s*YouTube\s*$/i, '').trim();
  }
  return cleaned;
}
