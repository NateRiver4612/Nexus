import type { Db } from '@nexus/db';
import type {
  MilestoneWithTasksListType,
  MilestoneWithTasksType,
  ProjectMilestonesTasksInputType,
} from '@nexus/types';

import { MilestoneRepository, type MilestoneWithTasksRow } from './repository';

export function MilestoneService(db: Db) {
  const repository = MilestoneRepository(db);

  /** A project's milestones with their tasks nested, in plan order. */
  async function listMilestones(projectId: string): Promise<MilestoneWithTasksListType> {
    const rows = await repository.listMilestonesWithTasks(projectId);

    return rows.map(toView);
  }

  /**
   * Bulk reorder of milestones and their tasks. Renumbers positions 0..n-1 by
   * array order (milestone index, then task index within its group) and sets
   * each task's `milestoneId` to the milestone it's nested under — so dragging
   * a task to a different milestone persists the FK move in the same call.
   */
  async function updateMilestonesPositions(
    projectId: string,
    input: ProjectMilestonesTasksInputType,
  ): Promise<MilestoneWithTasksListType> {
    await db.transaction(async (tx) => {
      const txRepository = MilestoneRepository(tx);

      for (const [milestoneIndex, milestone] of input.milestones.entries()) {
        await txRepository.updateMilestonePosition(projectId, milestone.id, milestoneIndex);

        for (const [taskIndex, task] of milestone.tasks.entries()) {
          await txRepository.updateTaskPosition(projectId, task.id, milestone.id, taskIndex);
        }
      }
    });

    return listMilestones(projectId);
  }

  return { listMilestones, updateMilestonesPositions };
}

/**
 * The repository query already aliases task columns to the DTO's keys inside
 * the JSON; only the milestone's outer columns need the row → string mapping.
 */
function toView(row: MilestoneWithTasksRow): MilestoneWithTasksType {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    position: row.position,
    status: row.status,
    tasks: row.tasks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
