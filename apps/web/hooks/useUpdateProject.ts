import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateProjectInput } from '@nexus/types';

import { updateProject } from '@/api';

import { projectKeys } from './queryKeys';

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => updateProject(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
