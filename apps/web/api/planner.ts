import type { CreatePlannerItemInputType, UpdatePlannerItemInputType } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function createPlannerItem(projectId: string, input: CreatePlannerItemInputType) {
  return handleResponse(
    await apiClient.api.v1.planner[':projectId'].$post({ param: { projectId }, json: input }),
  );
}

export async function updatePlannerItem(id: string, input: UpdatePlannerItemInputType) {
  return handleResponse(
    await apiClient.api.v1.planner.items[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deletePlannerItem(id: string) {
  return handleResponse(await apiClient.api.v1.planner.items[':id'].$delete({ param: { id } }));
}
