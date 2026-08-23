import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateKnowledgeItemInput } from '@nexus/types';

import { createKnowledgeItem } from '@/api';

import { knowledgeKeys } from './queryKeys';

export function useCreateKnowledgeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateKnowledgeItemInput) => createKnowledgeItem(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
  });
}
