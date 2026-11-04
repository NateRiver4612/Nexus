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
import { toastError } from '@/lib/toast';
import { toast } from 'sonner';

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
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: deliverableKeys.all });
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useAssignDeliverables = createMutationHook(assignDeliverables, (queryClient) => ({
  onSuccess: (res, variables) => {
    queryClient.invalidateQueries({ queryKey: deliverableKeys.assigned(variables.projectId) });
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useDeleteDeliverable = createMutationHook(deleteDeliverable, (queryClient) => ({
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: deliverableKeys.all });
    toast.success(res.message);
  },
  onError: toastError,
}));

export const useRemoveDeliverable = createMutationHook(removeDeliverable, (queryClient) => ({
  onSuccess: (res, variables) => {
    queryClient.invalidateQueries({ queryKey: deliverableKeys.assigned(variables.projectId) });
    toast.success(res.message);
  },
  onError: toastError,
}));
