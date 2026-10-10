import { useQuery } from '@tanstack/react-query';

import type { SearchQueryType } from '@nexus/types';

import { search } from '@/api/search';

import { searchKeys } from './queryKeys';

export function useSearch(query: SearchQueryType) {
  return useQuery({
    queryKey: searchKeys.results(query),
    queryFn: () => search(query),
    enabled: query.q.length > 0,
  });
}
