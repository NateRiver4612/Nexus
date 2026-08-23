import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateArtifactInput } from '@nexus/types';

import { createArtifact } from '@/api';

import { artifactKeys } from './queryKeys';

export function useCreateArtifact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateArtifactInput) => createArtifact(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.list(projectId) }),
  });
}
