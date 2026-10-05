import { useQuery } from '@tanstack/react-query';

import { listArtifacts } from '@/api';

import { artifactKeys } from './queryKeys';

export function useArtifacts(projectId: string) {
  return useQuery({
    queryKey: artifactKeys.list(projectId),
    queryFn: () => listArtifacts(projectId),
    enabled: Boolean(projectId),
  });
}
