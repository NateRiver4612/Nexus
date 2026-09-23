import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateAiSuggestionInputType,
  CreateConversationInputType,
  CreateMessageInputType,
  UpdateAiSuggestionInputType,
  UpdateConversationInputType,
} from '@nexus/types';

import {
  createAiSuggestion,
  createConversation,
  deleteAiSuggestion,
  getAiRun,
  getAiRuns,
  getAiSuggestions,
  getConversations,
  getMessages,
  postMessage,
  updateAiSuggestion,
  updateConversation,
} from '@/api/ai';

import { aiRunKeys, aiSuggestionKeys, conversationKeys, messageKeys } from './queryKeys';
import { createDetailQueryHook } from './createQuery';

export function useGetAiSuggestions(projectId: string) {
  return useQuery({
    queryKey: aiSuggestionKeys.list(projectId),
    queryFn: () => getAiSuggestions(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateAiSuggestion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAiSuggestionInputType) => createAiSuggestion(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
  });
}

export function useUpdateAiSuggestion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAiSuggestionInputType }) =>
      updateAiSuggestion(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
  });
}

export function useDeleteAiSuggestion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAiSuggestion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
  });
}

export function useGetAiRuns(projectId: string) {
  return useQuery({
    queryKey: aiRunKeys.list(projectId),
    queryFn: () => getAiRuns(projectId),
    enabled: Boolean(projectId),
  });
}

export const useGetAiRun = createDetailQueryHook(getAiRun, (id) => aiRunKeys.detail(id), {
  refetchInterval(query) {
    const status = query.state.data?.status;

    if (status === 'processing' || status === 'queued') {
      return 3000;
    }
    return false;
  },
});

export function useGetConversations(projectId: string) {
  return useQuery({
    queryKey: conversationKeys.list(projectId),
    queryFn: () => getConversations(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateConversation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateConversationInputType) => createConversation(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
  });
}

export function useUpdateConversation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateConversationInputType }) =>
      updateConversation(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
  });
}

export function useGetMessages(conversationId: string) {
  return useQuery({
    queryKey: messageKeys.list(conversationId),
    queryFn: () => getMessages(conversationId),
    enabled: Boolean(conversationId),
  });
}

export function usePostMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMessageInputType) => postMessage(conversationId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messageKeys.list(conversationId) }),
  });
}
