import type {
  AssignDeliverablesInputType,
  CreateDeliverableInputType,
  DeliverableListType,
  DeliverableType,
  OkType,
  SuccessResponse,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getDeliverables(projectId?: string): Promise<DeliverableListType> {
  return (await handleResponse(
    await apiClient.api.v1.deliverables.$get({
      query: { projectId },
    }),
  )) as DeliverableListType;
}

export async function getProjectDeliverables(projectId: string): Promise<DeliverableListType> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].deliverables.$get({ param: { projectId } }),
  )) as DeliverableListType;
}

export async function createDeliverable(
  input: CreateDeliverableInputType,
): Promise<SuccessResponse<DeliverableType>> {
  return (await handleResponse(
    await apiClient.api.v1.deliverables.$post({ json: input }),
  )) as SuccessResponse<DeliverableType>;
}

export async function assignDeliverables(input: {
  projectId: string;
  deliverableIds: AssignDeliverablesInputType['deliverableIds'];
}): Promise<SuccessResponse<DeliverableListType>> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].deliverables.$post({
      param: { projectId: input.projectId },
      json: { deliverableIds: input.deliverableIds },
    }),
  )) as SuccessResponse<DeliverableListType>;
}

export async function deleteDeliverable(input: {
  projectId: string;
  deliverableId: string;
}): Promise<SuccessResponse<DeliverableType>> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].deliverables[':deliverableId'].delete.$delete({
      param: {
        projectId: input.projectId,
        deliverableId: input.deliverableId,
      },
    }),
  )) as SuccessResponse<DeliverableType>;
}

export async function removeDeliverable(input: {
  projectId: string;
  deliverableId: string;
}): Promise<SuccessResponse<OkType>> {
  return (await handleResponse(
    await apiClient.api.v1.projects[':projectId'].deliverables[':deliverableId'].remove.$delete({
      param: {
        projectId: input.projectId,
        deliverableId: input.deliverableId,
      },
    }),
  )) as SuccessResponse<OkType>;
}
