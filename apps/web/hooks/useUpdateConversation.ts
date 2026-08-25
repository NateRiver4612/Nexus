import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateConversationInput } from '@nexus/types';

import { updateConversation } from '@/api';

import { conversationKeys } from './queryKeys';

export function useUpdateConversation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateConversationInput }) =>
      updateConversation(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
  });
}