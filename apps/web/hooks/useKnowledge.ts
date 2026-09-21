import type {
  CreateKnowledgeItemInputType,
  CreateKnowledgeSourcesInputType,
  CreateUploadUrlInputType,
  KnowledgeSourceListType,
  UpdateKnowledgeItemInputType,
} from '@nexus/types';

import {
  createKnowledgeItem,
  createKnowledgeSources,
  deleteKnowledgeItem,
  deleteKnowledgeSource,
  getKnowledge,
  getKnowledgeSources,
  getKnowledgeUploadUrl,
  updateKnowledgeItem,
} from '@/api/knowledge';

import { createMutationHook } from '@/hooks/createMutation';
import { createDetailQueryHook } from '@/hooks/createQuery';
import { knowledgeKeys } from './queryKeys';

export const useGetKnowledge = createDetailQueryHook(getKnowledge, (projectId) =>
  knowledgeKeys.list(projectId),
);

export const useGetKnowledgeSources = createDetailQueryHook(
  getKnowledgeSources,
  (projectId) => knowledgeKeys.sources(projectId),
  {
    refetchInterval(query) {
      if (query.state.data?.some((d) => d.status === 'processing' || d.status === 'pending')) {
        return 3000;
      }
      return false;
    },
  },
);

export const useCreateKnowledgeItem = (projectId: string) =>
  createMutationHook(
    (input: CreateKnowledgeItemInputType) => createKnowledgeItem(projectId, input),
    (queryClient) => ({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
    }),
  )();

export const useUpdateKnowledgeItem = (projectId: string) =>
  createMutationHook(
    ({ id, input }: { id: string; input: UpdateKnowledgeItemInputType }) =>
      updateKnowledgeItem(id, input),
    (queryClient) => ({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
    }),
  )();

export const useDeleteKnowledgeItem = (projectId: string) =>
  createMutationHook(
    (id: string) => deleteKnowledgeItem(id),
    (queryClient) => ({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.list(projectId) }),
    }),
  )();

export const useCreateKnowledgeSources = (projectId: string) =>
  createMutationHook(
    (input: CreateKnowledgeSourcesInputType) => createKnowledgeSources(projectId, input),
    (queryClient) => ({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: knowledgeKeys.sources(projectId) }),
    }),
  )();

export const useCreateKnowledgeUploadUrl = (projectId: string) =>
  createMutationHook((input: CreateUploadUrlInputType) =>
    getKnowledgeUploadUrl(projectId, input),
  )();

export const useDeleteKnowledgeSource = createMutationHook(
  ({ projectId, sourceId }: { projectId: string; sourceId: string }) =>
    deleteKnowledgeSource(projectId, sourceId),
  (queryClient) => ({
    onSuccess(_, { projectId, sourceId }) {
      queryClient.setQueryData<KnowledgeSourceListType>(knowledgeKeys.sources(projectId), (old) =>
        old?.filter((source) => source.id !== sourceId),
      );
      queryClient.invalidateQueries({
        queryKey: knowledgeKeys.sources(projectId),
      });
    },
  }),
);
