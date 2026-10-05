import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateNotificationInput } from '@nexus/types';

import { createNotification, getNotifications, readNotification } from '@/api/notifications';

import { notificationKeys } from './queryKeys';

export function useGetNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => getNotifications(),
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNotificationInput) => createNotification(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useReadNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => readNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
