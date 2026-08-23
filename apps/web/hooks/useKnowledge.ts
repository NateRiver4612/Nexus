import { useQuery } from '@tanstack/react-query';

import { listKnowledge } from '@/api';

import { knowledgeKeys } from './queryKeys';

export function useKnowledge(projectId: string) {
  return useQuery({
    queryKey: knowledgeKeys.list(projectId),
    queryFn: () => listKnowledge(projectId),
    enabled: Boolean(projectId),
  });
}
