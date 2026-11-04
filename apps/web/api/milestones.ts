import type {
  MilestoneWithTasksListType,
  ProjectMilestonesTasksInputType,
  SuccessResponse,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getMilestones(projectId: string) {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].milestones.$get({ param: { projectId } }),
  )) as MilestoneWithTasksListType;
}

export async function updateMilestonesPositions({
  projectId,
  input,
}: {
  projectId: string;
  input: ProjectMilestonesTasksInputType;
}): Promise<SuccessResponse<MilestoneWithTasksListType>> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].milestones.positions.$patch({
      param: { projectId },
      json: input,
    }),
  )) as SuccessResponse<MilestoneWithTasksListType>;
}
