import type { SearchQuery } from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function search(query: SearchQuery) {
  return handleResponse(await apiClient.api.v1.search.$get({ query }));
}
