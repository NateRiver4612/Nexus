import type {
  CompleteOnboardingType,
  CreateProjectInputType,
  KickoffPlanType,
  OkType,
  OnboardingIdQueryType,
  OnboardingStateType,
  ProjectDetailListType,
  ProjectDetailType,
  ProjectType,
  UpdateOnboardingInputType,
  UpdateProjectInputType,
  SubmitOnboardingOutputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getProjects(): Promise<ProjectDetailListType> {
  return (await handleResponse(await apiClient.api.v1.projects.$get())) as ProjectDetailListType;
}

export async function getProject(id: string): Promise<ProjectDetailType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':id'].$get({ param: { id } }),
  )) as ProjectDetailType;
}

export async function createProject(input: CreateProjectInputType): Promise<ProjectType> {
  return (await handleResponse(
    await apiClient.api.v1.projects.$post({ json: input }),
  )) as ProjectType;
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInputType,
): Promise<ProjectType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].$patch({ param: { projectId }, json: input }),
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

export async function submitProjectOnboarding(input: {
  projectId: string;
  onboardingId: OnboardingIdQueryType['onboardingId'];
}): Promise<SubmitOnboardingOutputType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].onboarding[':onboardingId'].submit.$post({
      param: { projectId: input.projectId, onboardingId: input.onboardingId },
    }),
  )) as SubmitOnboardingOutputType;
}

export async function completeProjectOnboarding(input: {
  projectId: string;
  onboardingId: string;
  plan: KickoffPlanType;
}): Promise<CompleteOnboardingType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].onboarding[':onboardingId'].complete.$post({
      param: { projectId: input.projectId, onboardingId: input.onboardingId },
      json: input.plan,
    }),
  )) as CompleteOnboardingType;
}
