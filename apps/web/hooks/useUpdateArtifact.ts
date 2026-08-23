import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateArtifactInput } from '@nexus/types';

import { updateArtifact } from '@/api';

import { artifactKeys } from './queryKeys';

export function useUpdateArtifact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateArtifactInput }) =>
      updateArtifact(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.list(projectId) }),
  });
}
