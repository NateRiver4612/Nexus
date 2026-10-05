import {
  createDeliverable,
  deleteDeliverable,
  getDeliverables,
  getSystemDeliverables,
} from '@/api/deliverables';

import { createMutationHook } from '@/hooks/createMutation';
import { createDetailQueryHook, createQueryHook } from '@/hooks/createQuery';
import { deliverableKeys } from './queryKeys';

export const useGetDeliverables = createDetailQueryHook(getDeliverables, (projectId) =>
  deliverableKeys.list(projectId),
);

export const useGetSystemDeliverables = createQueryHook(
  getSystemDeliverables,
  () => deliverableKeys.system,
);

export const useCreateDeliverable = createMutationHook(createDeliverable, (queryClient) => ({
  onSuccess: (_, variables) =>
    queryClient.invalidateQueries({ queryKey: deliverableKeys.list(variables.projectId) }),
}));

export const useDeleteDeliverable = createMutationHook(deleteDeliverable, (queryClient) => ({
  onSuccess: (_, variables) =>
    queryClient.invalidateQueries({ queryKey: deliverableKeys.list(variables.projectId) }),
}));
