import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreatePlannerItemInputType, UpdatePlannerItemInputType } from '@nexus/types';

import { createPlannerItem, deletePlannerItem, getPlanner, updatePlannerItem } from '@/api/planner';

import { plannerKeys } from './queryKeys';

export function useGetPlanner(projectId: string) {
  return useQuery({
    queryKey: plannerKeys.list(projectId),
    queryFn: () => getPlanner(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreatePlannerItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlannerItemInputType) => createPlannerItem(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKeys.list(projectId) }),
  });
}

export function useUpdatePlannerItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlannerItemInputType }) =>
      updatePlannerItem(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKeys.list(projectId) }),
  });
}

export function useDeletePlannerItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePlannerItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKeys.list(projectId) }),
  });
}
