import { and, asc, eq } from 'drizzle-orm';

import { knowledgeSourceChunks, knowledgeSources, type Db } from '@nexus/db';

type KnowledgeDb = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

export type SourceRow = typeof knowledgeSources.$inferSelect;
export type NewSourceRow = typeof knowledgeSources.$inferInsert;
export type NewChunkRow = typeof knowledgeSourceChunks.$inferInsert;

export const KnowledgeRepository = (db: KnowledgeDb) => ({
  insertSource(values: NewSourceRow) {
    return db.insert(knowledgeSources).values(values).returning();
  },

  async getSourceById(id: string) {
    const rows = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.id, id))
      .limit(1);
    return rows[0];
  },

  async listSources(projectId: string) {
    return db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.projectId, projectId))
      .orderBy(asc(knowledgeSources.createdAt));
  },

  async deleteSource(id: string, projectId: string) {
    return (
      await db
        .delete(knowledgeSources)
        .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.projectId, projectId)))
        .returning()
    )[0];
  },

  updateSource(id: string, patch: Partial<NewSourceRow>) {
    return db.update(knowledgeSources).set(patch).where(eq(knowledgeSources.id, id)).returning();
  },

  async deleteChunksForSource(sourceId: string) {
    return db
      .delete(knowledgeSourceChunks)
      .where(eq(knowledgeSourceChunks.knowledgeSourceId, sourceId));
  },

  insertChunks(rows: NewChunkRow[]) {
    return db.insert(knowledgeSourceChunks).values(rows);
  },
});
