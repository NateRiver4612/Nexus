import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAiSuggestion } from '@/api';

import { aiSuggestionKeys } from './queryKeys';

export function useDeleteAiSuggestion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAiSuggestion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
  });
}