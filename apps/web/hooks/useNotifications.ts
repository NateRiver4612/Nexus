import { useQuery } from '@tanstack/react-query';

import { listNotifications } from '@/api';

import { notificationKeys } from './queryKeys';

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => listNotifications(),
  });
}
