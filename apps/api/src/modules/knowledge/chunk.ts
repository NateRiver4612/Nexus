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
    const pieces =
      paragraph.length > targetChars ? splitIntoPieces(paragraph, targetChars) : [paragraph];
    for (const sentence of pieces) {
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

/**
 * Break a block into pieces that fit `maxChars`: sentence boundaries first, then a hard cut
 * for anything still too long (punctuation is language-specific, so sentences aren't a safe
 * bound).
 */
function splitIntoPieces(block: string, maxChars: number): string[] {
  return sentenceSplit(block).flatMap((sentence) =>
    sentence.length <= maxChars ? [sentence] : hardSplit(sentence, maxChars),
  );
}

/** Cut `block` into pieces no longer than `maxChars`, preferring whitespace boundaries. */
function hardSplit(block: string, maxChars: number): string[] {
  const pieces: string[] = [];
  let rest = block;

  while (rest.length > maxChars) {
    const boundary = rest.lastIndexOf(' ', maxChars);
    // Only break at a word in the second half; otherwise take a full cut, not a stub.
    const cut = boundary >= maxChars / 2 ? boundary : maxChars;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  const tail = rest.trim();
  if (tail) pieces.push(tail);
  return pieces;
}
