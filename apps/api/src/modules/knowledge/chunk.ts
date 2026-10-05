/** Approximate English tokens (1 token ≈ 4 chars). Good enough for chunk sizing. */
const CHARS_PER_TOKEN = 4;

type ChunkOptions = {
  targetTokens?: number;
  overlapTokens?: number;
};

/**
 * Split text into overlapping chunks of roughly `targetTokens` (~800 default),
 * keeping `overlapTokens` (~10%) of the previous chunk at the start of the next.
 * Preserves paragraph breaks where possible.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const targetTokens = options.targetTokens ?? 800;
  const overlapTokens = options.overlapTokens ?? Math.floor(targetTokens * 0.1);

  const targetChars = targetTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized.length === 0) return [];

  // Split on paragraph breaks first (blank-line separated), then fall back to sentences.
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const piece = paragraph.length > targetChars ? sentenceSplit(paragraph) : [paragraph];
    for (const sentence of piece) {
      if (current.length + sentence.length > targetChars && current.length > 0) {
        chunks.push(current.trim());
        // Carry the tail of the previous chunk across for context.
        current = current.slice(-overlapChars) + '\n';
      }
      current += sentence + '\n';
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 0);
}

function sentenceSplit(block: string): string[] {
  return block
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
