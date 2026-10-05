import { and, asc, eq, sql } from 'drizzle-orm';

import { milestones, tasks, type Db } from '@nexus/db';
import type { MilestoneWithTasksType } from '@nexus/types';

const milestoneWithTasksFields = {
  id: milestones.id,
  projectId: milestones.projectId,
  title: milestones.title,
  description: milestones.description,
  position: milestones.position,
  status: milestones.status,
  createdAt: milestones.createdAt,
  updatedAt: milestones.updatedAt,
  tasks: sql<MilestoneWithTasksType['tasks']>`
    coalesce(
      jsonb_agg(
        to_jsonb(${tasks})
        order by ${tasks.position}
      ) filter (where ${tasks.id} is not null),
      '[]'::jsonb
    )
  `,
};

export const MilestoneRepository = (db: Db) => ({
  /** A project's milestones with tasks nested, in plan order — one query. */
  listMilestonesWithTasks(projectId: string) {
    return db
      .select(milestoneWithTasksFields)
      .from(milestones)
      .leftJoin(tasks, eq(tasks.milestoneId, milestones.id))
      .where(eq(milestones.projectId, projectId))
      .groupBy(milestones.id)
      .orderBy(asc(milestones.position));
  },

  /** Rewrites one milestone's position — scoped to the project so foreign ids are a no-op. */
  updateMilestonePosition(projectId: string, id: string, position: number) {
    return db
      .update(milestones)
      .set({ position })
      .where(and(eq(milestones.projectId, projectId), eq(milestones.id, id)))
      .returning();
  },

  /**
   * Rewrites one task's position and milestone (cross-milestone moves: `milestoneId`
   * becomes the group it's nested under). Scoped to the project so foreign ids are a no-op.
   */
  updateTaskPosition(projectId: string, id: string, milestoneId: string, position: number) {
    return db
      .update(tasks)
      .set({ milestoneId, position })
      .where(and(eq(tasks.projectId, projectId), eq(tasks.id, id)))
      .returning();
  },
});

/** Resolved row shape of the milestones-with-tasks query. */
export type MilestoneWithTasksRow = Awaited<
  ReturnType<ReturnType<typeof MilestoneRepository>['listMilestonesWithTasks']>
>[number];
