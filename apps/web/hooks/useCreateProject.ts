import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateProjectInput } from '@nexus/types';

import { createProject } from '@/api';

import { projectKeys } from './queryKeys';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
