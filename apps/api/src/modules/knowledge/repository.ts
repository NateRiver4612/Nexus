import { asc, eq } from 'drizzle-orm';

import { getDb, knowledgeSourceChunks, knowledgeSources } from '@nexus/db';

export type SourceRow = typeof knowledgeSources.$inferSelect;
export type NewSourceRow = typeof knowledgeSources.$inferInsert;
export type NewChunkRow = typeof knowledgeSourceChunks.$inferInsert;

export const knowledgeRepository = {
  insertSource(values: NewSourceRow) {
    return getDb().insert(knowledgeSources).values(values).returning();
  },

  async getSourceById(id: string) {
    const rows = await getDb()
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.id, id))
      .limit(1);
    return rows[0];
  },

  async listSources(projectId: string) {
    return getDb()
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.projectId, projectId))
      .orderBy(asc(knowledgeSources.createdAt));
  },

  async deleteSource(id: string) {
    return getDb().delete(knowledgeSources).where(eq(knowledgeSources.id, id)).returning();
  },

  updateSource(id: string, patch: Partial<NewSourceRow>) {
    return getDb()
      .update(knowledgeSources)
      .set(patch)
      .where(eq(knowledgeSources.id, id))
      .returning();
  },

  async deleteChunksForSource(sourceId: string) {
    return getDb()
      .delete(knowledgeSourceChunks)
      .where(eq(knowledgeSourceChunks.knowledgeSourceId, sourceId));
  },

  insertChunks(rows: NewChunkRow[]) {
    return getDb().insert(knowledgeSourceChunks).values(rows);
  },
};
