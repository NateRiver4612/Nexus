import type { Db } from '@nexus/db';
import { KnowledgeChunkRepository } from './repository';

export function KnowledgeChunkService(db: Db) {
  const repository = KnowledgeChunkRepository(db);

  async function searchChunksByEmbedding(input: {
    projectId: string;
    queryEmbedding: number[];
    limit: number;
  }) {
    return await repository.search(input);
  }

  async function getChunksByProject({
    projectId,
    perSourceLimit,
  }: {
    projectId: string;
    perSourceLimit: number;
  }) {
    const rows = await repository.list({ projectId });

    // Group + slice per source in JS — simplest way to express "top N per
    // group" without a window function, fine at onboarding-time chunk counts.
    const bySource = new Map<string, typeof rows>();
    for (const row of rows) {
      const existing = bySource.get(row.knowledgeSourceId) ?? [];
      if (existing.length < perSourceLimit) {
        existing.push(row);
        bySource.set(row.knowledgeSourceId, existing);
      }
    }
    return Array.from(bySource.values()).flat();
  }

  async function searchChunksByEmbeddingForSource(input: {
    sourceId: string;
    queryEmbedding: number[];
    limit: number;
  }) {
    return await repository.searchBySource(input);
  }

  return {
    getChunksByProject,
    searchChunksByEmbedding,
    searchChunksByEmbeddingForSource,
  };
}
