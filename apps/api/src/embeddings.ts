import { env } from './env';
import { getOpenAI } from './lib/client';

/** Must match `file_chunks.embedding` dimensions. */
export const EMBEDDING_DIMENSIONS = 1536;

export function getEmbeddingModel() {
  return env.AI_EMBEDDING_MODEL;
}

/**
 * Embed a batch of texts. Returns one vector per input, each
 * `EMBEDDING_DIMENSIONS` long. Empty input short-circuits to `[]`.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openai = getOpenAI();

  const response = await openai.embeddings.create({
    model: getEmbeddingModel(),
    input: texts,
  });

  return response.data.map((entry) => entry.embedding);
}

/** Embed a single text. */
export async function embedText(text: string): Promise<number[]> {
  const [vector] = await generateEmbeddings([text]);
  return vector ?? [];
}
