import {
  assignDeliverables,
  createDeliverable,
  deleteDeliverable,
  removeDeliverable,
  getDeliverables,
  getProjectDeliverables,
} from '@/api/deliverables';

import { createMutationHook } from '@/hooks/createMutation';
import { createDetailQueryHook } from '@/hooks/createQuery';
import { deliverableKeys } from './queryKeys';

/** Available catalog — optional project scoping includes that project's own deliverables. */
export const useGetDeliverables = createDetailQueryHook(getDeliverables, (projectId) =>
  deliverableKeys.list(projectId ?? 'all'),
);

/** A project's selected deliverables. */
export const useGetProjectDeliverables = createDetailQueryHook(
  getProjectDeliverables,
  (projectId) => deliverableKeys.assigned(projectId),
);

export const useCreateDeliverable = createMutationHook(createDeliverable, (queryClient) => ({
  onSuccess: () => queryClient.invalidateQueries({ queryKey: deliverableKeys.all }),
}));

export const useAssignDeliverables = createMutationHook(assignDeliverables, (queryClient) => ({
  onSuccess: (_, variables) =>
    queryClient.invalidateQueries({ queryKey: deliverableKeys.assigned(variables.projectId) }),
}));

export const useDeleteDeliverable = createMutationHook(deleteDeliverable, (queryClient) => ({
  onSuccess: () => queryClient.invalidateQueries({ queryKey: deliverableKeys.all }),
}));

export const useRemoveDeliverable = createMutationHook(removeDeliverable, (queryClient) => ({
  onSuccess: (_, variables) =>
    queryClient.invalidateQueries({ queryKey: deliverableKeys.assigned(variables.projectId) }),
}));
