import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteArtifact } from '@/api';

import { artifactKeys } from './queryKeys';

export function useDeleteArtifact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteArtifact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.list(projectId) }),
  });
}
