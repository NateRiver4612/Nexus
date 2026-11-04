import { getProjectResearch } from '@/api/research';

import { researchKeys } from './queryKeys';
import { createDetailQueryHook } from './createQuery';

const POLL_INTERVAL_MS = 5_000;

export const useGetProjectResearch = createDetailQueryHook(
  getProjectResearch,
  (projectId) => researchKeys.project(projectId),
  {
    refetchInterval(query) {
      const status = query.state.data?.status;

      if (status === 'pending' || status === 'in_progress') {
        return POLL_INTERVAL_MS;
      }

      return false;
    },
  },
);
