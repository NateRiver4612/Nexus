import { knowledgeSourceChunks, type Db } from '@nexus/db';
import { cosineDistance, eq, and, isNotNull, gt } from 'drizzle-orm';

export const KnowledgeChunkRepository = (db: Db) => ({
  search({
    projectId,
    queryEmbedding,
    limit,
  }: {
    projectId: string;
    queryEmbedding: number[];
    limit: number;
  }) {
    const similarity = cosineDistance(knowledgeSourceChunks.embedding, queryEmbedding);

    return db
      .select({
        id: knowledgeSourceChunks.id,
        knowledgeSourceId: knowledgeSourceChunks.knowledgeSourceId,
        content: knowledgeSourceChunks.content,
        similarity,
      })
      .from(knowledgeSourceChunks)
      .where(
        and(
          gt(similarity, 0.5),
          eq(knowledgeSourceChunks.projectId, projectId),
          isNotNull(knowledgeSourceChunks.embedding),
        ),
      )
      .orderBy(similarity)
      .limit(limit);
  },

  list({ projectId }: { projectId: string }) {
    return db
      .select({
        id: knowledgeSourceChunks.id,
        knowledgeSourceId: knowledgeSourceChunks.knowledgeSourceId,
        content: knowledgeSourceChunks.content,
        chunkIndex: knowledgeSourceChunks.chunkIndex,
      })
      .from(knowledgeSourceChunks)
      .where(eq(knowledgeSourceChunks.projectId, projectId))
      .orderBy(knowledgeSourceChunks.knowledgeSourceId, knowledgeSourceChunks.chunkIndex);
  },

  searchBySource({
    sourceId,
    queryEmbedding,
    limit,
  }: {
    sourceId: string;
    queryEmbedding: number[];
    limit: number;
  }) {
    const similarity = cosineDistance(knowledgeSourceChunks.embedding, queryEmbedding);

    return db
      .select({
        id: knowledgeSourceChunks.id,
        knowledgeSourceId: knowledgeSourceChunks.knowledgeSourceId,
        content: knowledgeSourceChunks.content,
        similarity,
      })
      .from(knowledgeSourceChunks)
      .where(
        and(
          gt(similarity, 0.5),
          eq(knowledgeSourceChunks.knowledgeSourceId, sourceId),
          isNotNull(knowledgeSourceChunks.embedding),
        ),
      )
      .orderBy(similarity)
      .limit(limit);
  },
});
