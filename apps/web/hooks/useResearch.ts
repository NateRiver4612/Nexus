import {
  getActiveProjectResearch,
  getProjectResearch,
  getProjectResearchHistory,
  startProjectResearch,
} from '@/api/research';

import { researchKeys } from './queryKeys';
import { createDetailQueryHook } from './createQuery';
import { createMutationHook } from './createMutation';

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

/** Every completed research run for a project, oldest first (one entry per version). */
export const useGetProjectResearchHistory = createDetailQueryHook(
  getProjectResearchHistory,
  (projectId) => researchKeys.history(projectId),
);

/**
 * One-shot discovery: finds the in-flight research run on load. The run id is
 * stable while it processes, and status is polled via `/ai/runs/:id`, so this
 * must not poll — it refetches only when invalidated (e.g. on completion).
 */
export const useGetActiveProjectResearch = createDetailQueryHook(
  getActiveProjectResearch,
  (projectId) => researchKeys.active(projectId),
);

export const useStartProjectResearch = createMutationHook(
  ({
    projectId,
    reason,
    sourceLimit,
  }: {
    projectId: string;
    reason?: string;
    sourceLimit?: number;
  }) => startProjectResearch(projectId, { reason, sourceLimit }),
  (queryClient) => ({
    onSuccess: (result, variables) => {
      queryClient.setQueryData(researchKeys.active(variables.projectId), result);
      queryClient.invalidateQueries({ queryKey: researchKeys.active(variables.projectId) });
    },
  }),
);
