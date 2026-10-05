import { useQuery } from '@tanstack/react-query';

import type { SearchQuery } from '@nexus/types';

import { search } from '@/api';

import { searchKeys } from './queryKeys';

export function useSearch(query: SearchQuery) {
  return useQuery({
    queryKey: searchKeys.results(query),
    queryFn: () => search(query),
    enabled: query.q.length > 0,
  });
}
