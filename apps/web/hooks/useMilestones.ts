import { getMilestones, updateMilestonesPositions } from '@/api/milestones';

import { milestoneKeys } from './queryKeys';
import { createDetailQueryHook } from './createQuery';
import { createMutationHook } from './createMutation';
import { toastError } from '@/lib/toast';
import { toast } from 'sonner';

export const useGetMilestones = createDetailQueryHook(getMilestones, (projectId) =>
  milestoneKeys.list(projectId),
);

export const useUpdateMilestonesPositions = createMutationHook(
  updateMilestonesPositions,
  (queryClient) => ({
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(variables.projectId) });
      toast.success(res.message);
    },
    onError: toastError,
  }),
);
