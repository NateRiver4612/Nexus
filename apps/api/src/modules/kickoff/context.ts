import type { Db } from '@nexus/db';
import type { OnboardingDataType } from '@nexus/types';
import { generateEmbeddings } from '../../embeddings';
import { env } from '../../env';
import { KnowledgeRepository } from '../knowledge/repository';
import { KnowledgeChunkService } from '../knowledgeChunk/service';

export type KnowledgeChunkGroup = {
  title: string;
  excerpts: string[];
};

const PER_SOURCE_FLOOR = 2; // every source gets at least this many chunks, if it has any
const GLOBAL_FILL_TARGET = 12; // total chunks after floor + fill, budget permitting
const LEADING_CHUNKS_PER_SOURCE = 3; // fallback when embeddings are unavailable
const MAX_CONTEXT_CHARS = 6000; // rough token budget — see note in prompt.ts

/**
 * Builds the knowledge context for Kickoff.
 *
 * Two-pass retrieval, not a single global top-K:
 *   1. FLOOR — every source in the project gets its own top-N chunks by
 *      relevance to the goal, guaranteeing no uploaded file is silently
 *      dropped just because another source's chunks scored higher overall.
 *   2. FILL — remaining budget (up to GLOBAL_FILL_TARGET total) is filled
 *      with the next-best chunks project-wide, so genuinely more-relevant
 *      sources still get proportionally more space.
 *
 * step1/step2 text is only ever the *search query* — it does not restrict
 * which chunks are eligible. Every source's chunks (files, links, text,
 * YouTube) are searched; step1/step2 just decide the ranking.
 *
 * Falls back to "first few chunks per source" when embeddings aren't
 * available (dev without OPENAI_API_KEY).
 */
export async function buildKnowledgeContext({
  db,
  projectId,
  stepData,
}: {
  db: Db;
  projectId: string;
  stepData: OnboardingDataType;
}): Promise<KnowledgeChunkGroup[]> {
  const knowledgeChunkService = KnowledgeChunkService(db);

  const knowledgeRepository = KnowledgeRepository(db);
  const canEmbed = Boolean(env.OPENAI_API_KEY);

  const sources = await knowledgeRepository.listSources(projectId);
  if (sources.length === 0) return [];

  const rawChunks = canEmbed
    ? await searchWithFloorAndFill(knowledgeChunkService, projectId, sources, stepData)
    : await knowledgeChunkService.getChunksByProject({
        projectId,
        perSourceLimit: LEADING_CHUNKS_PER_SOURCE,
      });

  if (rawChunks.length === 0) return [];

  const titles = new Map(sources.map((s) => [s.id, s.name ?? 'Untitled']));

  const groups = new Map<string, string[]>();
  let usedChars = 0;

  for (const chunk of rawChunks) {
    if (usedChars >= MAX_CONTEXT_CHARS) break;
    const title = titles.get(chunk.knowledgeSourceId) ?? 'Untitled';
    const excerpts = groups.get(title) ?? [];
    excerpts.push(chunk.content);
    groups.set(title, excerpts);
    usedChars += chunk.content.length;
  }

  return Array.from(groups.entries()).map(([title, excerpts]) => ({ title, excerpts }));
}

async function searchWithFloorAndFill(
  knowledgeChunkService: ReturnType<typeof KnowledgeChunkService>,
  projectId: string,
  sources: Array<{ id: string }>,
  stepData: OnboardingDataType,
) {
  const pseudoQuery = buildPseudoQuery(stepData);
  if (!pseudoQuery) return [];

  const [queryEmbedding] = await generateEmbeddings([pseudoQuery]);

  if (!queryEmbedding) return [];

  // Pass 1 — floor: guaranteed representation per source.
  const floorResults = await Promise.all(
    sources.map((source) =>
      knowledgeChunkService.searchChunksByEmbeddingForSource({
        sourceId: source.id,
        queryEmbedding,
        limit: PER_SOURCE_FLOOR,
      }),
    ),
  );
  const floorChunks = floorResults.flat();
  const floorIds = new Set(floorChunks.map((c) => c.id));

  const remainingSlots = GLOBAL_FILL_TARGET - floorChunks.length;

  if (remainingSlots <= 0) return floorChunks;

  // Pass 2 — fill: best remaining chunks project-wide, excluding what the floor already grabbed.
  const globalResults = await knowledgeChunkService.searchChunksByEmbedding({
    projectId,
    queryEmbedding,
    limit: remainingSlots + floorChunks.length, // over-fetch to survive the dedupe filter below
  });
  const fillChunks = globalResults.filter((c) => !floorIds.has(c.id)).slice(0, remainingSlots);

  return [...floorChunks, ...fillChunks];
}

function buildPseudoQuery(stepData: OnboardingDataType): string | null {
  const { step1, step2 } = stepData;
  const parts = [step1?.name, step1?.description, step2?.context].filter(Boolean);
  return parts.length > 0 ? parts.join('. ') : null;
}
