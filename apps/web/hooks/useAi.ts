import type {
  AttachmentType,
  ChatArtifactType,
  ChatAttachmentType,
  ChatCitationType,
  ChatQuestionsType,
  CreateAiSuggestionInputType,
  CreateConversationInputType,
  UpdateAiSuggestionInputType,
  UpdateConversationInputType,
} from '@nexus/types';
import { citationKey } from '@nexus/zod-schemas';

import {
  createAiSuggestion,
  createConversation,
  deleteAiSuggestion,
  deleteConversation,
  getAiRun,
  getAiRuns,
  getAiSuggestions,
  getConversations,
  getMessages,
  streamMessage,
  updateAiSuggestion,
  updateConversation,
} from '@/api/ai';
import { confirmAttachment, createAttachmentUploadUrl } from '@/api/attachments';

import {
  aiRunKeys,
  aiSuggestionKeys,
  artifactKeys,
  conversationKeys,
  messageKeys,
} from './queryKeys';
import { createDetailQueryHook, createQueryHook } from './createQuery';
import { createMutationHook } from './createMutation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useGetAiSuggestions = createDetailQueryHook(getAiSuggestions, (projectId) =>
  aiSuggestionKeys.list(projectId),
);

export const useCreateAiSuggestion = (projectId: string) =>
  createMutationHook(
    (input: CreateAiSuggestionInputType) => createAiSuggestion(projectId, input),
    (queryClient) => ({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
    }),
  )();

export const useUpdateAiSuggestion = (projectId: string) =>
  createMutationHook(
    ({ id, input }: { id: string; input: UpdateAiSuggestionInputType }) =>
      updateAiSuggestion(id, input),
    (queryClient) => ({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
    }),
  )();

export const useDeleteAiSuggestion = (projectId: string) =>
  createMutationHook(
    (id: string) => deleteAiSuggestion(id),
    (queryClient) => ({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: aiSuggestionKeys.list(projectId) }),
    }),
  )();

export const useGetAiRuns = createDetailQueryHook(getAiRuns, (projectId) =>
  aiRunKeys.list(projectId),
);

export const useGetAiRun = createDetailQueryHook(getAiRun, (id) => aiRunKeys.detail(id), {
  refetchInterval(query) {
    const status = query.state.data?.status;

    if (status === 'processing' || status === 'queued') {
      return 3000;
    }
    return false;
  },
});

export const useGetConversations = createDetailQueryHook(getConversations, (projectId) =>
  conversationKeys.list(projectId),
);

export const useCreateConversation = (projectId: string) =>
  createMutationHook(
    (input: CreateConversationInputType) => createConversation(projectId, input),
    (queryClient) => ({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
    }),
  )();

export const useUpdateConversation = (projectId: string) =>
  createMutationHook(
    ({ id, input }: { id: string; input: UpdateConversationInputType }) =>
      updateConversation(id, input),
    (queryClient) => ({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
    }),
  )();

export const useDeleteConversation = (projectId: string) =>
  createMutationHook(
    (id: string) => deleteConversation(id),
    (queryClient) => ({
      onSuccess: async () => {
        // Deleting a conversation also deletes the artifacts that belong to it.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
          queryClient.invalidateQueries({ queryKey: artifactKeys.all }),
        ]);
      },
    }),
  )();

type MessagePageVariables = {
  conversationId: string;
  limit?: number;
  cursor?: number;
};

export const useGetMessages = createQueryHook(
  ({ conversationId, limit = 50, cursor }: MessagePageVariables) =>
    getMessages(conversationId, { limit, ...(cursor !== undefined ? { cursor } : {}) }),
  ({ conversationId }) => messageKeys.list(conversationId),
  { getEnabled: ({ conversationId }) => Boolean(conversationId) },
);

/** The turn that is still streaming: the user's text and the reply received so far. */
export type PendingTurn = {
  content: string;
  /** Files attached to this turn, shown as chips in the optimistic user bubble. */
  attachments: ChatAttachmentType[];
  text: string;
  sources: ChatCitationType[];
  /** Artifacts the assistant saved this turn, shown as cards under the reply. */
  artifacts: ChatArtifactType[];
  /** Questions from `ask_user`, shown as cards under the reply. */
  questions: ChatQuestionsType;
  /** `create_artifact` is running — show a skeleton card until the real one arrives. */
  creatingArtifact: boolean;
  /** Label of the tool that is running right now, e.g. "Searching knowledge…". */
  activity: string | null;
};

/**
 * Streams one assistant reply at a time for a conversation. The in-flight turn lives in local
 * state; once the stream ends the message and thread lists are refetched and the local copy is
 * dropped, so the server stays the source of truth. Mount it with `key={conversationId}`.
 */
export function useSendMessage({
  projectId,
  conversationId,
  onArtifactCreated,
}: {
  projectId: string;
  conversationId: string;
  /** Fired the moment the assistant saves an artifact, so the panel can auto-open. */
  onArtifactCreated?: (artifact: ChatArtifactType) => void;
}) {
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Leaving the thread (navigate to another page) mid-reply aborts it; the server still saves what was generated.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const send = useCallback(
    async (content: string, attachments: ChatAttachmentType[] = []) => {
      if (controllerRef.current) return;

      const controller = new AbortController();
      controllerRef.current = controller;
      setError(null);
      setPending({
        content,
        attachments,
        text: '',
        sources: [],
        artifacts: [],
        questions: [],
        creatingArtifact: false,
        activity: null,
      });

      try {
        for await (const event of streamMessage({
          conversationId,
          input: { content, attachmentIds: attachments.map((attachment) => attachment.id) },
          signal: controller.signal,
        })) {
          if (event.type === 'text-delta') {
            setPending((turn) => turn && { ...turn, text: turn.text + event.text });
          } else if (event.type === 'tool') {
            setPending(
              (turn) =>
                turn && {
                  ...turn,
                  activity: event.status === 'running' ? event.label : null,
                  creatingArtifact: event.name === 'create_artifact' && event.status === 'running',
                },
            );
          } else if (event.type === 'sources') {
            setPending(
              (turn) =>
                turn && {
                  ...turn,
                  sources: [
                    ...turn.sources,
                    ...event.sources.filter(
                      (source) =>
                        !turn.sources.some((known) => citationKey(known) === citationKey(source)),
                    ),
                  ],
                },
            );
          } else if (event.type === 'artifact') {
            setPending((turn) =>
              turn
                ? {
                    ...turn,
                    artifacts: [...turn.artifacts, event.artifact],
                    creatingArtifact: false,
                  }
                : turn,
            );
            onArtifactCreated?.(event.artifact);
          } else if (event.type === 'question') {
            setPending((turn) => turn && { ...turn, questions: event.questions });
          } else if (event.type === 'error') {
            setError(event.message);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        controllerRef.current = null;

        // The server saves a stopped reply after it notices the disconnect, so give it a
        // moment before refetching or the partial message would flash away.
        if (controller.signal.aborted) await new Promise((resolve) => setTimeout(resolve, 500));

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: messageKeys.list(conversationId) }),
          queryClient.invalidateQueries({ queryKey: conversationKeys.list(projectId) }),
          // Artifacts belong to the project, so a save must refresh any open panel's content
          // (e.g. a new version) and the project's artifact list.
          queryClient.invalidateQueries({ queryKey: artifactKeys.all }),
        ]);
        setPending(null);
      }
    },
    [conversationId, projectId, queryClient, onArtifactCreated],
  );

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  return { send, stop, pending, error, isStreaming: pending !== null };
}

/**
 * Uploads one file to chat: request a presigned URL, PUT the file straight to S3, then confirm so
 * the server extracts its text. Only metadata crosses our API — the bytes never touch the API.
 * `onCreated` fires as soon as the server row exists, so the caller can clean up even if a later
 * step fails. Returns the confirmed attachment (status `ready`, or `failed` with a reason).
 */
export function useUploadAttachment(conversationId: string) {
  return useCallback(
    async (file: File, onCreated?: (attachmentId: string) => void): Promise<AttachmentType> => {
      const { attachmentId, url } = await createAttachmentUploadUrl(conversationId, {
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      onCreated?.(attachmentId);

      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);

      return confirmAttachment(conversationId, attachmentId);
    },
    [conversationId],
  );
}
