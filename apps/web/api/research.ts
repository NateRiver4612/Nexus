import type { ProjectResearchType } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getProjectResearch(projectId: string): Promise<ProjectResearchType | null> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].research.$get({ param: { projectId } }),
  )) as ProjectResearchType | null;
}
