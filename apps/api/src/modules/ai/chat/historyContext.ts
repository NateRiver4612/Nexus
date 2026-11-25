import type { MessageType } from '@nexus/types';
import { chatQuestionsSchema } from '@nexus/zod-schemas';

import type { ChatMessage } from '../types';
import {
  attachmentsOf,
  formatAttachmentStubs,
  formatCurrentTurnAttachments,
} from './attachmentContext';

/** Values the history handler needs from the route; all keyed by attachment or message id. */
export type HistoryMessageContext = {
  /** The user message sent in this run; its attachments are inlined in full. */
  currentMessageId: string;
  /** Extracted text for this turn's attachments, keyed by attachment id. */
  currentTurnText: Map<string, string>;
  /** Character counts for earlier attachments, keyed by attachment id. */
  charCounts: Map<string, number>;
};

/**
 * Turns one stored message into the turns the model sees. A message can expand to more than one
 * `ChatMessage`: a user message's attachments become separate `system` blocks, while an assistant
 * message's questions are folded into its text.
 */
export function toModelMessages({
  message,
  ...context
}: { message: MessageType } & HistoryMessageContext): ChatMessage[] {
  if (message.role === 'system') return [];
  if (message.role === 'user') return userHistoryMessages({ message, ...context });

  return [assistantHistoryMessage({ message })];
}

/**
 * Current-turn files are pasted in full so the model can answer right away; older ones stay as
 * short stubs and are reopened with `read_attachment` when needed.
 */
function userHistoryMessages({
  message,
  currentMessageId,
  currentTurnText,
  charCounts,
}: { message: MessageType } & HistoryMessageContext): ChatMessage[] {
  const attachments = attachmentsOf(message.metadata);
  const result: ChatMessage[] = [];

  if (attachments.length > 0) {
    const block =
      message.id === currentMessageId
        ? formatCurrentTurnAttachments(
            attachments.map((attachment) => ({
              name: attachment.name,
              mimeType: attachment.mimeType,
              text: currentTurnText.get(attachment.id) ?? '',
            })),
          )
        : formatAttachmentStubs(
            attachments.map((attachment) => ({
              name: attachment.name,
              chars: charCounts.get(attachment.id) ?? 0,
            })),
          );

    if (block) result.push({ role: 'system', content: block });
  }

  result.push({ role: 'user', content: message.content });
  return result;
}

/** A question-only assistant turn rebuilds what it asked from metadata, not from its empty text. */
function assistantHistoryMessage({ message }: { message: MessageType }): ChatMessage {
  return {
    role: 'assistant',
    content: formatAssistantHistoryMessage({
      content: message.content,
      metadata: message.metadata,
    }),
  };
}

/**
 * Renders the questions stored in `messages.metadata.questions` into text for the model. Returns
 * the assistant content unchanged when there are none.
 */
export function formatAssistantHistoryMessage({
  content,
  metadata,
}: {
  content: string;
  metadata: Record<string, unknown> | null | undefined;
}): string {
  const parsed = chatQuestionsSchema.safeParse(metadata?.questions);
  if (!parsed.success) return content;

  const block = [
    '[Questions asked to the user]',
    ...parsed.data.map((question) => {
      const kind =
        question.kind === 'single'
          ? 'single choice'
          : question.kind === 'multiple'
            ? 'multiple choice'
            : 'free text';
      const options = question.options?.map((option) => option.label).join(', ');
      const suffix = options ? ` (${kind}: ${options})` : ` (${kind})`;

      return `- ${question.prompt}${suffix}${question.allowOther ? ' + Other' : ''}`;
    }),
  ].join('\n');

  return content.trim() ? `${content}\n\n${block}` : block;
}
