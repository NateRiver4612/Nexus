import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateArtifactInputType, UpdateArtifactInputType } from '@nexus/types';

import { createArtifact, deleteArtifact, getArtifacts, updateArtifact } from '@/api/artifacts';

import { artifactKeys } from './queryKeys';

export function useGetArtifacts(projectId: string) {
  return useQuery({
    queryKey: artifactKeys.list(projectId),
    queryFn: () => getArtifacts(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateArtifact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateArtifactInputType) => createArtifact(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.list(projectId) }),
  });
}

export function useUpdateArtifact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateArtifactInputType }) =>
      updateArtifact(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.list(projectId) }),
  });
}

export function useDeleteArtifact(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteArtifact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.list(projectId) }),
  });
}
