import OpenAI, { toFile } from 'openai';

import { env } from '../../../../env';
import { withUnrecoverable } from '../../../../queue-errors';
import type { EmbeddingProvider, TranscriptionInput, TranscriptionProvider } from '../../types';

/** Must match the pgvector column dimensions (`knowledge_source_chunks.embedding`). */
export const EMBEDDING_DIMENSIONS = 1536;

/** 400/401/403/404 (bad input, bad key, forbidden, missing model) won't improve on retry. */
const EMBEDDING_UNRECOVERABLE_STATUSES = [400, 401, 403, 404];

/**
 * Statuses that retrying can't fix: bad/corrupt audio (400/415/422), bad key or access
 * (401/403), missing model (404), oversized file (413). 429/5xx/network still retry.
 */
const TRANSCRIPTION_UNRECOVERABLE_STATUSES = [400, 401, 403, 404, 413, 415, 422];

/** OpenAI backs embeddings and audio transcription; one instance serves both. */
export class OpenAIProvider implements EmbeddingProvider, TranscriptionProvider {
  readonly name = 'openai';

  constructor(private readonly getClient: () => OpenAI) {}

  get model() {
    return env.AI_EMBEDDING_MODEL;
  }

  get dimensions() {
    return EMBEDDING_DIMENSIONS;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    return withUnrecoverable({
      promise: this.getClient()
        .embeddings.create({ model: this.model, input: texts })
        .then((response) => response.data.map((entry) => entry.embedding)),
      isUnrecoverable: (error) =>
        error instanceof OpenAI.APIError &&
        EMBEDDING_UNRECOVERABLE_STATUSES.includes(error.status ?? 0),
    });
  }

  async transcribe({ body, name, mimeType }: TranscriptionInput): Promise<string> {
    // OpenAI infers the format from the file name, so keep the original extension.
    const file = await toFile(body, name, { type: mimeType });

    return withUnrecoverable({
      promise: this.getClient().audio.transcriptions.create(
        { file, model: env.AI_TRANSCRIPTION_MODEL, response_format: 'text' },
        // BullMQ already retries the job; SDK retries on top would multiply billed attempts.
        { maxRetries: 0, timeout: env.AI_TRANSCRIPTION_TIMEOUT_MS },
      ),
      isUnrecoverable: (error) =>
        error instanceof OpenAI.APIError &&
        TRANSCRIPTION_UNRECOVERABLE_STATUSES.includes(error.status ?? 0),
    });
  }
}
