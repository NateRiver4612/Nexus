import OpenAI from 'openai';

/** Must match `file_chunks.embedding` dimensions. */
export const EMBEDDING_DIMENSIONS = 1536;

const globalForOpenAI = globalThis as unknown as { nexusOpenAI?: OpenAI };

export function getEmbeddingModel() {
  return process.env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
}

export function getOpenAI() {
  // Reuse a single client across hot-reloading dev servers.
  if (!globalForOpenAI.nexusOpenAI) {
    globalForOpenAI.nexusOpenAI = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? 'sk-missing',
    });
  }
  return globalForOpenAI.nexusOpenAI;
}

/**
 * Embed a batch of texts. Returns one vector per input, each
 * `EMBEDDING_DIMENSIONS` long. Empty input short-circuits to `[]`.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await getOpenAI().embeddings.create({
    model: getEmbeddingModel(),
    input: texts,
  });

  return response.data.map((entry) => entry.embedding);
}

/** Embed a single text. */
export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector ?? [];
}
