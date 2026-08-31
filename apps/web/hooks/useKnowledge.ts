import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateKnowledgeItemInput, UpdateKnowledgeItemInput } from '@nexus/types';

import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  getKnowledge,
  updateKnowledgeItem,
} from '@/api/knowledge';

import { knowledgeKeys } from './queryKeys';

export function useGetKnowledge(projectId: string) {
  return useQuery({
    queryKey: knowledgeKeys.list(projectId),
    queryFn: () => getKnowledge(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateKnowledgeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateKnowledgeItemInput) => createKnowledgeItem(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
  });
}

export function useUpdateKnowledgeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateKnowledgeItemInput }) =>
      updateKnowledgeItem(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
  });
}

export function useDeleteKnowledgeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteKnowledgeItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
  });
}