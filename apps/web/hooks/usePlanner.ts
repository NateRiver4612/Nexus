import { useQuery } from '@tanstack/react-query';

import { listPlanner } from '@/api';

import { plannerKeys } from './queryKeys';

export function usePlanner(projectId: string) {
  return useQuery({
    queryKey: plannerKeys.list(projectId),
    queryFn: () => listPlanner(projectId),
    enabled: Boolean(projectId),
  });
}
