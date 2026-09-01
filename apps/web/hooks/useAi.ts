import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateAiSuggestionInput,
  CreateConversationInput,
  CreateMessageInput,
  UpdateAiSuggestionInput,
  UpdateConversationInput,
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
    mutationFn: (input: CreateAiSuggestionInput) => createAiSuggestion(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
  });
}

export function useUpdateAiSuggestion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAiSuggestionInput }) =>
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

export function useAiRun(id: string) {
  return useQuery({
    queryKey: aiRunKeys.detail(id),
    queryFn: () => getAiRun(id),
    enabled: Boolean(id),
  });
}

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
    mutationFn: (input: CreateConversationInput) => createConversation(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
  });
}

export function useUpdateConversation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateConversationInput }) =>
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
    mutationFn: (input: CreateMessageInput) => postMessage(conversationId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messageKeys.list(conversationId) }),
  });
}
