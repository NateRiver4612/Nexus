import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateArtifactInputType } from '@nexus/types';

import { deleteArtifact, getArtifactContent, getArtifacts, updateArtifact } from '@/api/artifacts';

import { createQueryHook } from './createQuery';
import { artifactKeys } from './queryKeys';

export function useGetArtifacts({
  projectId,
  conversationId,
  enabled = true,
}: {
  projectId: string;
  conversationId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: artifactKeys.list(projectId, conversationId),
    queryFn: () => getArtifacts(projectId, conversationId),
    enabled: enabled && Boolean(projectId),
  });
}

/** One artifact's content (a specific version, or the newest when `version` is omitted). */
export const useGetArtifactContent = createQueryHook(
  ({ id, version }: { id: string; version?: number }) => getArtifactContent({ id, version }),
  ({ id, version }) => artifactKeys.content(id, version),
  { getEnabled: ({ id }) => Boolean(id) },
);

export function useUpdateArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateArtifactInputType }) =>
      updateArtifact(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.all }),
  });
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteArtifact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artifactKeys.all }),
  });
}
