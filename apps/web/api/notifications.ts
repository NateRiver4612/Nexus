import type { CreateNotificationInputType } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getNotifications() {
  return handleResponse(await apiClient.api.v1.notifications.$get());
}

export async function createNotification(input: CreateNotificationInputType) {
  return handleResponse(await apiClient.api.v1.notifications.$post({ json: input }));
}

export async function readNotification(id: string) {
  return handleResponse(await apiClient.api.v1.notifications[':id'].read.$post({ param: { id } }));
}
