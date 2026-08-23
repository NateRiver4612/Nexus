import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreatePlannerItemInput } from '@nexus/types';

import { createPlannerItem } from '@/api';

import { plannerKeys } from './queryKeys';

export function useCreatePlannerItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlannerItemInput) => createPlannerItem(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKeys.list(projectId) }),
  });
}
