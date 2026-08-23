import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/api';

import { userKeys } from './queryKeys';

export function useMe() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => getMe(),
  });
}
