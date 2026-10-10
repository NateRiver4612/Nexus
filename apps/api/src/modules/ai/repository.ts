import { eq, and } from 'drizzle-orm';

import { aiRuns, type Db } from '@nexus/db';

export const AIRepository = (db: Db) => ({
  async getById(id: string) {
    const rows = await db
      .select()
      .from(aiRuns)
      .where(and(eq(aiRuns.id, id)))
      .limit(1);
    return rows[0];
  },
});
