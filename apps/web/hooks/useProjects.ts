import { useQuery } from '@tanstack/react-query';

import { listProjects } from '@/api';

import { projectKeys } from './queryKeys';

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => listProjects(),
  });
}
