import type { MilestoneWithTasksListType, ProjectMilestonesTasksInputType } from '@nexus/types';

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
}) {
  return handleResponse(
    await apiClient.api.v1.projects[':projectId'].milestones.positions.$patch({
      param: { projectId },
      json: input,
    }),
  );
}
