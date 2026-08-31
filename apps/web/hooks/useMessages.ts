import { useQuery } from '@tanstack/react-query';

import { listMessages } from '@/api';

import { messageKeys } from './queryKeys';

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: messageKeys.list(conversationId),
    queryFn: () => listMessages(conversationId),
    enabled: Boolean(conversationId),
  });
}
