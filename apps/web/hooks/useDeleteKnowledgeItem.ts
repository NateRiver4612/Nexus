import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteKnowledgeItem } from '@/api';

import { knowledgeKeys } from './queryKeys';

export function useDeleteKnowledgeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteKnowledgeItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
  });
}
