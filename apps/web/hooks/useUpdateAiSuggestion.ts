import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateAiSuggestionInput } from '@nexus/types';

import { updateAiSuggestion } from '@/api';

import { aiSuggestionKeys } from './queryKeys';

export function useUpdateAiSuggestion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAiSuggestionInput }) =>
      updateAiSuggestion(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
  });
}
