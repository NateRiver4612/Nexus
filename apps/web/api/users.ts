import { apiClient, handleResponse } from '@/lib/client';

export async function getMe() {
  return handleResponse(await apiClient.api.v1.users.me.$get());
}
