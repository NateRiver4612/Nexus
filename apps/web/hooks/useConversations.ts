import { useQuery } from '@tanstack/react-query';

import { listConversations } from '@/api';

import { conversationKeys } from './queryKeys';

export function useConversations(projectId: string) {
  return useQuery({
    queryKey: conversationKeys.list(projectId),
    queryFn: () => listConversations(projectId),
    enabled: Boolean(projectId),
  });
}