import type {
  ProjectResearchListType,
  ProjectResearchRunType,
  ProjectResearchType,
  StartProjectResearchInputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getProjectResearch(projectId: string): Promise<ProjectResearchType | null> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].research.$get({ param: { projectId } }),
  )) as ProjectResearchType | null;
}

export async function getProjectResearchHistory(
  projectId: string,
): Promise<ProjectResearchListType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].research.history.$get({ param: { projectId } }),
  )) as ProjectResearchListType;
}

export async function getActiveProjectResearch(
  projectId: string,
): Promise<ProjectResearchRunType | null> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].research.active.$get({ param: { projectId } }),
  )) as ProjectResearchRunType | null;
}

export async function startProjectResearch(
  projectId: string,
  input: StartProjectResearchInputType,
): Promise<ProjectResearchRunType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].research.$post({
      param: { projectId },
      json: input,
    }),
  )) as ProjectResearchRunType;
}
