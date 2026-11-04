import type {
  AiRunListType,
  AiRunType,
  AiSuggestionListType,
  AiSuggestionType,
  ChatStreamEvent,
  ConversationListType,
  ConversationType,
  CreateAiSuggestionInputType,
  CreateConversationInputType,
  CreateMessageInputType,
  ErrorResponseType,
  MessagePageQueryType,
  MessagePageType,
  OkType,
  UpdateAiSuggestionInputType,
  UpdateConversationInputType,
} from '@nexus/types';

import { apiClient, handleResponse } from '@/lib/client';
import {
  chatTextDeltaEventSchema,
  chatDoneEventSchema,
  chatErrorEventSchema,
  chatToolEventSchema,
  chatSourcesEventSchema,
} from '@nexus/zod-schemas';
import { parseSSE } from '@/lib/Sse';

export async function getAiSuggestions(projectId: string): Promise<AiSuggestionListType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.suggestions[':projectId'].$get({ param: { projectId } }),
  )) as AiSuggestionListType;
}

export async function createAiSuggestion(
  projectId: string,
  input: CreateAiSuggestionInputType,
): Promise<AiSuggestionType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.suggestions[':projectId'].$post({
      param: { projectId },
      json: input,
    }),
  )) as AiSuggestionType;
}

export async function updateAiSuggestion(
  id: string,
  input: UpdateAiSuggestionInputType,
): Promise<AiSuggestionType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.suggestions.items[':id'].$patch({ param: { id }, json: input }),
  )) as AiSuggestionType;
}

export async function deleteAiSuggestion(id: string): Promise<OkType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.suggestions.items[':id'].$delete({ param: { id } }),
  )) as OkType;
}

export async function getAiRuns(projectId: string): Promise<AiRunListType> {
  // TODO: endpoint not implemented
  return Promise.resolve([]);
}

export async function getAiRun(id: string): Promise<AiRunType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.runs[':id'].$get({ param: { id } }),
  )) as AiRunType;
}

export async function getConversations(projectId: string): Promise<ConversationListType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':projectId'].$get({ param: { projectId } }),
  )) as ConversationListType;
}

export async function createConversation(
  projectId: string,
  input: CreateConversationInputType,
): Promise<ConversationType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':projectId'].$post({
      param: { projectId },
      json: input,
    }),
  )) as ConversationType;
}

export async function updateConversation(
  id: string,
  input: UpdateConversationInputType,
): Promise<ConversationType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':conversationId'].$patch({
      param: { conversationId: id },
      json: input,
    }),
  )) as ConversationType;
}

export async function deleteConversation(id: string): Promise<OkType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':conversationId'].$delete({
      param: { conversationId: id },
    }),
  )) as OkType;
}

export async function getMessages(
  conversationId: string,
  input: MessagePageQueryType,
): Promise<MessagePageType> {
  return (await handleResponse(
    await apiClient.api.v1.ai.conversations[':conversationId'].messages.$get({
      param: { conversationId },
      query: input,
    }),
  )) as MessagePageType;
}

/**
 * Sends a message and yields the assistant's reply as it streams. Failures that happen before
 * the stream opens (404, 401, validation) throw; failures after it opens arrive as an `error`
 * event. Aborting `signal` stops the stream, and the server keeps the partial reply.
 */
export async function* streamMessage({
  conversationId,
  input,
  signal,
}: {
  conversationId: string;
  input: CreateMessageInputType;
  signal: AbortSignal;
}): AsyncGenerator<ChatStreamEvent> {
  const res = await apiClient.api.v1.ai.conversations[':conversationId'].messages.$post(
    { param: { conversationId }, json: input },
    { init: { signal } },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorResponseType | null;
    throw new Error(body?.error.message ?? `Request failed with status ${res.status}`);
  }
  if (!res.body) throw new Error('The server returned an empty response.');

  for await (const { event, data } of parseSSE(res.body)) {
    const payload: unknown = JSON.parse(data);

    if (event === 'text-delta') {
      yield { type: 'text-delta', ...chatTextDeltaEventSchema.parse(payload) };
    } else if (event === 'tool') {
      yield { type: 'tool', ...chatToolEventSchema.parse(payload) };
    } else if (event === 'sources') {
      yield { type: 'sources', ...chatSourcesEventSchema.parse(payload) };
    } else if (event === 'done') {
      yield { type: 'done', ...chatDoneEventSchema.parse(payload) };
    } else if (event === 'error') {
      yield { type: 'error', ...chatErrorEventSchema.parse(payload) };
    }
  }
}
