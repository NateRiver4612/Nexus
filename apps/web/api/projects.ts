import type {
  CreateProjectInputType,
  OkType,
  OnboardingStateType,
  ProjectType,
  ProjectListType,
  UpdateOnboardingInputType,
  UpdateProjectInputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getProjects(): Promise<ProjectListType> {
  return (await handleResponse(await apiClient.api.v1.projects.$get())) as ProjectListType;
}

export async function getProject(id: string): Promise<ProjectType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':id'].$get({ param: { id } }),
  )) as ProjectType;
}

export async function createProject(input: CreateProjectInputType): Promise<ProjectType> {
  return (await handleResponse(
    await apiClient.api.v1.projects.$post({ json: input }),
  )) as ProjectType;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInputType,
): Promise<ProjectType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':id'].$patch({ param: { id }, json: input }),
  )) as ProjectType;
}

export async function deleteProject(id: string): Promise<OkType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':id'].$delete({ param: { id } }),
  )) as OkType;
}

export async function getOnboarding(): Promise<OnboardingStateType> {
  return (await handleResponse(
    await apiClient.api.v1.projects.onboarding.$get(),
  )) as OnboardingStateType;
}

export async function saveOnboarding(
  input: UpdateOnboardingInputType,
): Promise<OnboardingStateType> {
  return (await handleResponse(
    await apiClient.api.v1.projects.onboarding.$patch({ json: input }),
  )) as OnboardingStateType;
}
