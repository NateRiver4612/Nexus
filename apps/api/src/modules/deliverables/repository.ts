import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';

import {
  deliverables,
  deliverablesProjectsAssignment,
  type Db,
  type NewDeliverable,
  type NewDeliverablesProjectAssignment,
} from '@nexus/db';

export const DeliverableRepository = (db: Db) => ({
  /**
   * Available catalog listing. Project-id-less (global) rows are always
   * returned; project-owned rows are only included when they match the passed
   * `projectId`. No `projectId` → everything.
   */
  listAvailable(projectId?: string) {
    return db
      .select()
      .from(deliverables)
      .where(
        projectId
          ? or(isNull(deliverables.projectId), eq(deliverables.projectId, projectId))
          : undefined,
      )
      .orderBy(asc(deliverables.createdAt));
  },

  getByIds(deliverableIds: string[]) {
    return db.select().from(deliverables).where(inArray(deliverables.id, deliverableIds));
  },

  async getById(id: string) {
    const rows = await db.select().from(deliverables).where(eq(deliverables.id, id)).limit(1);
    return rows[0];
  },

  /** A project's selected deliverables, read through the assignment join table. */
  listAssignedByProject(projectId: string) {
    return db
      .select({ deliverable: deliverables })
      .from(deliverablesProjectsAssignment)
      .innerJoin(deliverables, eq(deliverablesProjectsAssignment.deliverableId, deliverables.id))
      .where(eq(deliverablesProjectsAssignment.projectId, projectId))
      .orderBy(asc(deliverables.createdAt));
  },

  insert(values: NewDeliverable) {
    return db.insert(deliverables).values(values).returning();
  },

  assignMany(projectId: string, deliverableIds: string[]) {
    if (deliverableIds.length === 0) return;

    const rows: NewDeliverablesProjectAssignment[] = deliverableIds.map((deliverableId) => ({
      deliverableId,
      projectId,
    }));

    return db
      .insert(deliverablesProjectsAssignment)
      .values(rows)
      .onConflictDoNothing({
        target: [
          deliverablesProjectsAssignment.deliverableId,
          deliverablesProjectsAssignment.projectId,
        ],
      });
  },

  async removeAssignment(projectId: string, deliverableId: string) {
    return (
      await db
        .delete(deliverablesProjectsAssignment)
        .where(
          and(
            eq(deliverablesProjectsAssignment.projectId, projectId),
            eq(deliverablesProjectsAssignment.deliverableId, deliverableId),
          ),
        )
        .returning()
    )[0];
  },

  /** Hard-delete a custom deliverable row — guarded by the isCustom filter. */
  async deleteCustomById(projectId: string, deliverableId: string) {
    return (
      await db
        .delete(deliverables)
        .where(
          and(
            eq(deliverables.id, deliverableId),
            eq(deliverables.projectId, projectId),
            eq(deliverables.isCustom, true),
          ),
        )
        .returning()
    )[0];
  },
});
