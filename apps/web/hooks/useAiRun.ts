import { useQuery } from '@tanstack/react-query';

import { getAiRun } from '@/api';

import { aiRunKeys } from './queryKeys';

export function useAiRun(id: string) {
  return useQuery({
    queryKey: aiRunKeys.detail(id),
    queryFn: () => getAiRun(id),
    enabled: Boolean(id),
  });
}
