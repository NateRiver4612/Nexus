import { and, eq } from 'drizzle-orm';

import { aiRuns, type Db, type NewAiRun } from '@nexus/db';

export const AIRepository = (db: Db) => ({
  async getById(id: string) {
    const rows = await db
      .select()
      .from(aiRuns)
      .where(and(eq(aiRuns.id, id)))
      .limit(1);
    return rows[0];
  },

  create(values: NewAiRun) {
    return db.insert(aiRuns).values(values).returning();
  },

  update({ id, patch }: { id: string; patch: Partial<NewAiRun> }) {
    return db
      .update(aiRuns)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(aiRuns.id, id))
      .returning();
  },
});
