import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateProjectInputType,
  UpdateOnboardingInputType,
  UpdateProjectInputType,
} from '@nexus/types';

import {
  createProject,
  deleteProject,
  getOnboarding,
  getProject,
  getProjects,
  saveOnboarding,
  updateProject,
} from '@/api/projects';

import { onboardingKeys, projectKeys } from './queryKeys';

export function useGetProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => getProjects(),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInputType) => createProject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export const useGetProjectOnboarding = () => {
  return useQuery({
    queryKey: onboardingKeys.all,
    queryFn: () => getOnboarding(),
    retry: false,
  });
};

export const useUpdateProjectOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOnboardingInputType) => saveOnboarding(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: onboardingKeys.all }),
  });
};

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectInputType) => updateProject(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
