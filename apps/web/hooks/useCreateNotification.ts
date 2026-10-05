import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateNotificationInput } from '@nexus/types';

import { createNotification } from '@/api';

import { notificationKeys } from './queryKeys';

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNotificationInput) => createNotification(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
