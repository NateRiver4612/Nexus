import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateMessageInput } from '@nexus/types';

import { postMessage } from '@/api';

import { messageKeys } from './queryKeys';

export function usePostMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMessageInput) => postMessage(conversationId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messageKeys.list(conversationId) }),
  });
}
