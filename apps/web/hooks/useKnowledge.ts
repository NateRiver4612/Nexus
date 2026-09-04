import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateKnowledgeItemInputType,
  CreateKnowledgeSourcesInputType,
  CreateUploadUrlInputType,
  KnowledgeSourceType,
  UpdateKnowledgeItemInputType,
} from '@nexus/types';

import {
  createKnowledgeItem,
  createKnowledgeSources,
  deleteKnowledgeItem,
  getKnowledge,
  getKnowledgeSources,
  getKnowledgeUploadUrl,
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
    mutationFn: (input: CreateKnowledgeItemInputType) => createKnowledgeItem(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
  });
}

export function useUpdateKnowledgeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateKnowledgeItemInputType }) =>
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

export function useGetKnowledgeSources(projectId: string) {
  return useQuery({
    queryKey: knowledgeKeys.sources(projectId),
    queryFn: () => getKnowledgeSources(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const data = query.state.data as KnowledgeSourceType[] | undefined;
      return data?.some((s) => s.status === 'pending' || s.status === 'processing') ? 1500 : false;
    },
  });
}

export function useCreateKnowledgeSources(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateKnowledgeSourcesInputType) =>
      createKnowledgeSources(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.sources(projectId) }),
  });
}

export function useCreateKnowledgeUploadUrl(projectId: string) {
  return useMutation({
    mutationFn: (input: CreateUploadUrlInputType) => getKnowledgeUploadUrl(projectId, input),
  });
}
