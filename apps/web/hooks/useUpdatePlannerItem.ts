import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdatePlannerItemInput } from '@nexus/types';

import { updatePlannerItem } from '@/api';

import { plannerKeys } from './queryKeys';

export function useUpdatePlannerItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlannerItemInput }) =>
      updatePlannerItem(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKeys.list(projectId) }),
  });
}
