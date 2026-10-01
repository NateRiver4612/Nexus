import { getMilestones, updateMilestonesPositions } from '@/api/milestones';

import { milestoneKeys } from './queryKeys';
import { createDetailQueryHook } from './createQuery';
import { createMutationHook } from './createMutation';

export const useGetMilestones = createDetailQueryHook(getMilestones, (projectId) =>
  milestoneKeys.list(projectId),
);

export const useUpdateMilestonesPositions = createMutationHook(
  updateMilestonesPositions,
  (queryClient) => ({
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(variables.projectId) }),
  }),
);
