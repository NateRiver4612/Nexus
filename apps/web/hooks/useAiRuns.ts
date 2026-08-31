import { useQuery } from '@tanstack/react-query';

import { listAiRuns } from '@/api';

import { aiRunKeys } from './queryKeys';

export function useAiRuns(projectId: string) {
  return useQuery({
    queryKey: aiRunKeys.list(projectId),
    queryFn: () => listAiRuns(projectId),
    enabled: Boolean(projectId),
  });
}
