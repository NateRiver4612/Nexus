import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteProject } from '@/api';

import { projectKeys } from './queryKeys';

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
