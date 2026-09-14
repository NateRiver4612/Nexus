import { deliverables, type Db } from '@nexus/db';
import type { CreateDeliverableInputType, DeliverableType } from '@nexus/types';

import { DeliverableRepository } from './repository';

type DeliverableRow = typeof deliverables.$inferSelect;

export function DeliverableService(db: Db) {
  const repository = DeliverableRepository(db);

  async function list(projectId: string): Promise<DeliverableType[]> {
    const rows = await repository.listByProject(projectId);
    return rows.map(toView);
  }

  async function listSystem(): Promise<DeliverableType[]> {
    const rows = await repository.listSystem();
    return rows.map(toView);
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

  async function remove(projectId: string, deliverableId: string): Promise<DeliverableType | null> {
    const row = await repository.remove(deliverableId, projectId);
    return row ? toView(row) : null;
  }

  return { list, listSystem, create, remove };
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
