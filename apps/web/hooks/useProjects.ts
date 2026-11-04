import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  KickoffPlanType,
  ProjectDetailType,
  UpdateOnboardingInputType,
  UpdateProjectInputType,
} from '@nexus/types';

import {
  completeProjectOnboarding,
  createProject,
  deleteProject,
  submitProjectOnboarding,
  getOnboarding,
  getProject,
  getProjects,
  saveOnboarding,
  updateProject,
} from '@/api/projects';

import { onboardingKeys, plannerKeys, projectKeys } from './queryKeys';
import { createMutationHook } from '@/hooks/createMutation';
import { createDetailQueryHook, createQueryHook } from '@/hooks/createQuery';
import { toastError } from '@/lib/toast';
import { toast } from 'sonner';

export function useGetProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => getProjects(),
  });
}

export const useGetProjectById = createDetailQueryHook(getProject, (id) => projectKeys.detail(id));

export const useCreateProject = createMutationHook(createProject, (queryClient) => ({
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
    toast.success(res.message);
  },
  onError: toastError,
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

export const useSubmitProjectOnboarding = createMutationHook(
  (input: { projectId: string; onboardingId: string }) => submitProjectOnboarding(input),
  (queryClient) => ({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
      queryClient.invalidateQueries({ queryKey: plannerKeys.list(variables.projectId) });
    },
  }),
);

export const useCompleteProjectOnboarding = createMutationHook(
  ({
    projectId,
    onboardingId,
    plan,
  }: {
    projectId: string;
    onboardingId: string;
    plan: KickoffPlanType;
  }) => completeProjectOnboarding({ projectId, onboardingId, plan }),
  (queryClient) => ({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.list(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  }),
);

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Awaited<ReturnType<typeof updateProject>>,
    unknown,
    UpdateProjectInputType,
    { previous: ProjectDetailType | undefined }
  >({
    mutationFn: (input: UpdateProjectInputType) => updateProject(id, input),
    onMutate: async (input) => {
      const queryKey = projectKeys.detail(id);

      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<ProjectDetailType>(queryKey);
      const nextName = input.name;

      if (nextName !== undefined) {
        queryClient.setQueryData<ProjectDetailType>(queryKey, (prev) =>
          prev ? { ...prev, name: nextName } : prev,
        );
      }

      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.detail(id), context.previous);
      }

      toastError(err);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(res.message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(res.message);
    },
    onError: toastError,
  });
}
