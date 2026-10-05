import type {
  CreateAiSuggestionInputType,
  CreateConversationInputType,
  CreateMessageInputType,
  UpdateAiSuggestionInputType,
  UpdateConversationInputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';

export async function getAiSuggestions(projectId: string) {
  return handleResponse(
    await apiClient.api.v1.ai.suggestions[':projectId'].$get({ param: { projectId } }),
  );
}

export async function createAiSuggestion(projectId: string, input: CreateAiSuggestionInputType) {
  return handleResponse(
    await apiClient.api.v1.ai.suggestions[':projectId'].$post({
      param: { projectId },
      json: input,
    }),
  );
}

export async function updateAiSuggestion(id: string, input: UpdateAiSuggestionInputType) {
  return handleResponse(
    await apiClient.api.v1.ai.suggestions.items[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function deleteAiSuggestion(id: string) {
  return handleResponse(
    await apiClient.api.v1.ai.suggestions.items[':id'].$delete({ param: { id } }),
  );
}

export async function getAiRuns(projectId: string) {
  return handleResponse(
    await apiClient.api.v1.ai.runs[':projectId'].$get({ param: { projectId } }),
  );
}

export async function getAiRun(id: string) {
  return handleResponse(await apiClient.api.v1.ai.runs.items[':id'].$get({ param: { id } }));
}

export async function getConversations(projectId: string) {
  return handleResponse(
    await apiClient.api.v1.ai.conversations[':projectId'].$get({ param: { projectId } }),
  );
}

export async function createConversation(projectId: string, input: CreateConversationInputType) {
  return handleResponse(
    await apiClient.api.v1.ai.conversations[':projectId'].$post({
      param: { projectId },
      json: input,
    }),
  );
}

export async function updateConversation(id: string, input: UpdateConversationInputType) {
  return handleResponse(
    await apiClient.api.v1.ai.conversations.items[':id'].$patch({ param: { id }, json: input }),
  );
}

export async function getMessages(conversationId: string) {
  return handleResponse(
    await apiClient.api.v1.ai.conversations.items[':id'].messages.$get({
      param: { id: conversationId },
    }),
  );
}

export async function postMessage(conversationId: string, input: CreateMessageInputType) {
  return handleResponse(
    await apiClient.api.v1.ai.conversations.items[':id'].messages.$post({
      param: { id: conversationId },
      json: input,
    }),
  );
}
