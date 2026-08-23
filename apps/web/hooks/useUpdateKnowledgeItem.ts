import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateKnowledgeItemInput } from '@nexus/types';

import { updateKnowledgeItem } from '@/api';

import { knowledgeKeys } from './queryKeys';

export function useUpdateKnowledgeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateKnowledgeItemInput }) =>
      updateKnowledgeItem(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
  });
}
