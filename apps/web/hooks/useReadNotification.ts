import { useMutation, useQueryClient } from '@tanstack/react-query';

import { readNotification } from '@/api';

import { notificationKeys } from './queryKeys';

export function useReadNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => readNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
