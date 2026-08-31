import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateConversationInput } from '@nexus/types';

import { createConversation } from '@/api';

import { conversationKeys } from './queryKeys';

export function useCreateConversation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateConversationInput) => createConversation(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
  });
}
