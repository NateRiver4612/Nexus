import { and, asc, eq } from 'drizzle-orm';

import { deliverables, type Db, type NewDeliverable } from '@nexus/db';

export const DeliverableRepository = (db: Db) => ({
  listByProject(projectId: string) {
    return db
      .select()
      .from(deliverables)
      .where(eq(deliverables.projectId, projectId))
      .orderBy(asc(deliverables.createdAt));
  },

  listSystem() {
    return db
      .select()
      .from(deliverables)
      .where(eq(deliverables.isSystem, true))
      .orderBy(asc(deliverables.createdAt));
  },

  insert(values: NewDeliverable) {
    return db.insert(deliverables).values(values).returning();
  },

  async remove(id: string, projectId: string) {
    return (
      await db
        .delete(deliverables)
        .where(and(eq(deliverables.id, id), eq(deliverables.projectId, projectId)))
        .returning()
    )[0];
  },
});
