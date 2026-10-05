import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deletePlannerItem } from '@/api';

import { plannerKeys } from './queryKeys';

export function useDeletePlannerItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePlannerItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKeys.list(projectId) }),
  });
}
