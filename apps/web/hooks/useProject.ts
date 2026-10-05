import { useQuery } from '@tanstack/react-query';

import { getProject } from '@/api';

import { projectKeys } from './queryKeys';

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: Boolean(id),
  });
}
