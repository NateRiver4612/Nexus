import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateOnboardingInputType, UpdateProjectInputType } from '@nexus/types';

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
import { createMutationHook } from '@/hooks/createMutation';
import { createDetailQueryHook, createQueryHook } from '@/hooks/createQuery';

export function useGetProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => getProjects(),
  });
}

export const useGetProjectById = createDetailQueryHook(getProject, (id) => projectKeys.detail(id));

export const useCreateProject = createMutationHook(createProject, (queryClient) => ({
  onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
}));

export const useGetOnboarding = createQueryHook(getOnboarding, () => onboardingKeys.all, {
  defaultOptions: {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  },
});

export const useSaveOnboardingStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOnboardingInputType) => saveOnboarding(input),
    onSuccess: (data) => queryClient.setQueryData(onboardingKeys.all, data),
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
