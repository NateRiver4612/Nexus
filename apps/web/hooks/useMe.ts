import { useQuery } from '@tanstack/react-query';

import { userKeys } from './queryKeys';
import { authClient } from '@/lib/authClient';

export function useMe() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      return (await authClient.getSession()).data?.user;
    },
  });
}
