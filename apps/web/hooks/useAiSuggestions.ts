import { useQuery } from '@tanstack/react-query';

import { listAiSuggestions } from '@/api';

import { aiSuggestionKeys } from './queryKeys';

export function useAiSuggestions(projectId: string) {
  return useQuery({
    queryKey: aiSuggestionKeys.list(projectId),
    queryFn: () => listAiSuggestions(projectId),
    enabled: Boolean(projectId),
  });
}
