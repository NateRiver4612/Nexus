import { deliverables, type Db } from '@nexus/db';
import type {
  AssignDeliverablesInputType,
  CreateDeliverableInputType,
  DeliverableType,
} from '@nexus/types';

import { HttpError } from '../../errors';
import { DeliverableRepository } from './repository';

type DeliverableRow = typeof deliverables.$inferSelect;

export function DeliverableService(db: Db) {
  const repository = DeliverableRepository(db);

  /** Available for a project — global presets + that project's own rows. */
  async function list(projectId?: string): Promise<DeliverableType[]> {
    const rows = await repository.listAvailable(projectId);
    return rows.map(toView);
  }

  /** A project's selected deliverables, via the assignment join. */
  async function listAssigned(projectId: string): Promise<DeliverableType[]> {
    const rows = await repository.listAssignedByProject(projectId);
    return rows.map((row) => toView(row.deliverable));
  }

  async function create(
    input: CreateDeliverableInputType,
    userId: string,
  ): Promise<DeliverableType> {
    const rows = await repository.insert({
      projectId: input.projectId,
      name: input.name,
      kind: input.kind,
      isCustom: input.isCustom ?? false,
      isSystem: false, // user-created rows are never system
      createdBy: userId,
    });
    return toView(rows[0]!);
  }

  /**
   * Validates that every requested deliverable exists and is available to the
   * project (a global preset, or owned by this project). Throws 404 otherwise.
   */
  async function ensureAssignable(projectId: string, deliverableIds: string[]) {
    const unique = [...new Set(deliverableIds)];
    if (unique.length === 0) return;

    const rows = await repository.getByIds(unique);
    const found = new Map(rows.map((row) => [row.id, row]));

    for (const deliverableId of unique) {
      const row = found.get(deliverableId);
      if (!row || (row.projectId && row.projectId !== projectId)) {
        throw HttpError.notFound(`Deliverable ${deliverableId} is not available for this project.`);
      }
    }
  }

  async function assign(
    projectId: string,
    deliverableIds: AssignDeliverablesInputType['deliverableIds'],
  ) {
    await repository.assignMany(projectId, deliverableIds);
  }

  async function remove(projectId: string, deliverableId: string) {
    await repository.removeAssignment(projectId, deliverableId);
  }

  /** Hard-deletes a custom deliverable row — returns the deleted row, or null. */
  async function removeCustom(
    projectId: string,
    deliverableId: string,
  ): Promise<DeliverableType | null> {
    const row = await repository.deleteCustomById(projectId, deliverableId);
    return row ? toView(row) : null;
  }

  return { list, listAssigned, create, assign, remove, removeCustom, ensureAssignable };
}

function toView(row: DeliverableRow): DeliverableType {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    kind: row.kind,
    isCustom: row.isCustom,
    isSystem: row.isSystem,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
