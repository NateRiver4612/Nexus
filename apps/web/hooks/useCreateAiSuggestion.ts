import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateAiSuggestionInput } from '@nexus/types';

import { createAiSuggestion } from '@/api';

import { aiSuggestionKeys } from './queryKeys';

export function useCreateAiSuggestion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAiSuggestionInput) => createAiSuggestion(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
  });
}
