import type { CreateProjectInput, UpdateProjectInput } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getProjects() {
  return handleResponse(await apiClient.api.v1.projects.$get());
}

export async function getProject(id: string) {
  return handleResponse(await apiClient.api.v1.projects[':id'].$get({ param: { id } }));
}

export async function createProject(input: CreateProjectInput) {
  return handleResponse(await apiClient.api.v1.projects.$post({ json: input }));
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  return handleResponse(
    await apiClient.api.v1.projects[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteProject(id: string) {
  return handleResponse(await apiClient.api.v1.projects[':id'].$delete({ param: { id } }));
}
