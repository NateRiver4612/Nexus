import type {
  CreateDeliverableInputType,
  DeliverableListType,
  DeliverableType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getDeliverables(projectId: string): Promise<DeliverableListType> {
  return (await handleResponse(
    await apiClient.api.v1.deliverables[':projectId'].$get({ param: { projectId } }),
  )) as DeliverableListType;
}

export async function getSystemDeliverables(): Promise<DeliverableListType> {
  return (await handleResponse(
    await apiClient.api.v1.deliverables.system.$get(),
  )) as DeliverableListType;
}

export async function createDeliverable(
  input: CreateDeliverableInputType,
): Promise<DeliverableType> {
  return (await handleResponse(
    await apiClient.api.v1.deliverables.$post({ json: input }),
  )) as DeliverableType;
}

export async function deleteDeliverable(input: {
  projectId: string;
  deliverableId: string;
}): Promise<DeliverableType> {
  return (await handleResponse(
    await apiClient.api.v1.deliverables[':projectId'][':deliverableId'].$delete({
      param: {
        projectId: input.projectId,
        deliverableId: input.deliverableId,
      },
    }),
  )) as DeliverableType;
}
