import type {
  ArtifactRefType,
  ChatArtifactType,
  ChatAttachmentType,
  ChatCitationType,
  ChatQuestionsType,
  MessageType,
} from '@nexus/types';
import {
  chatArtifactsSchema,
  chatAttachmentsSchema,
  chatCitationsSchema,
  chatQuestionsSchema,
} from '@nexus/zod-schemas';

import { ArtifactCard, ArtifactCardSkeleton } from './ArtifactCard';
import { ChatAttachmentChip } from './ChatAttachmentChip';
import { ChatQuestionCard } from './ChatQuestionCard';
import { ChatSources } from './ChatSources';
import { Markdown } from './Markdown';

type ChatMessageProps = {
  role: MessageType['role'];
  content: string;
  /** Thread the message belongs to; chat file previews are scoped to it. */
  conversationId: string;
  /** The reply was cut short (the user stopped it, or the provider failed mid-stream). */
  partial?: boolean;
  isStreaming?: boolean;
  attachments?: ChatAttachmentType[];
  sources?: ChatCitationType[];
  artifacts?: ChatArtifactType[];
  /** Questions from `ask_user`, shown as cards under the reply. */
  questions?: ChatQuestionsType;
  /** A later user message exists, so the questions are locked. */
  answered?: boolean;
  /** The later user message content, shown on an answered card. */
  answer?: string;
  /** `create_artifact` is running — show a skeleton card in its place. */
  creatingArtifact?: boolean;
  onOpenArtifact?: (artifact: ArtifactRefType) => void;
  /** Opens the attachment detail dialog. */
  onOpenAttachment?: (attachment: ChatAttachmentType) => void;
  /** The tool running right now, shown while the reply is still being produced. */
  activity?: string | null;
};

/** Citations are stored in `metadata.citations`; anything malformed is simply not shown. */
export function citationsOf(metadata: MessageType['metadata']): ChatCitationType[] {
  const parsed = chatCitationsSchema.safeParse(metadata?.citations);
  return parsed.success ? parsed.data : [];
}

/** Saved in `metadata.artifacts`; anything malformed is simply not shown. */
export function artifactsOf(metadata: MessageType['metadata']): ChatArtifactType[] {
  const parsed = chatArtifactsSchema.safeParse(metadata?.artifacts);
  return parsed.success ? parsed.data : [];
}

/** Saved in `metadata.attachments`; anything malformed is simply not shown. */
export function attachmentsOf(metadata: MessageType['metadata']): ChatAttachmentType[] {
  const parsed = chatAttachmentsSchema.safeParse(metadata?.attachments);
  return parsed.success ? parsed.data : [];
}

/** Saved in `metadata.questions`; anything malformed is simply not shown. */
export function questionsOf(metadata: MessageType['metadata']): ChatQuestionsType {
  const parsed = chatQuestionsSchema.safeParse(metadata?.questions);
  return parsed.success ? parsed.data : [];
}

export function ChatMessage({
  role,
  content,
  conversationId,
  partial,
  attachments,
  artifacts,
  questions,
  answered,
  answer,
  creatingArtifact,
  onOpenArtifact,
  onOpenAttachment,
  isStreaming,
  sources,
  activity,
}: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[90%] flex-col items-end gap-1.5">
          {attachments?.length ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {attachments.map((attachment) => (
                <ChatAttachmentChip
                  key={attachment.id}
                  conversationId={conversationId}
                  attachmentId={attachment.id}
                  name={attachment.name}
                  mimeType={attachment.mimeType}
                  size={attachment.size}
                  onOpen={onOpenAttachment ? () => onOpenAttachment(attachment) : undefined}
                />
              ))}
            </div>
          ) : null}
          <p className="rounded-2xl bg-secondary px-4 py-2 text-sm whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {activity ? (
        <p className="mb-1 text-sm text-muted-foreground">{activity}</p>
      ) : (
        !content &&
        !questions?.length &&
        isStreaming && <p className="text-sm text-muted-foreground">Thinking…</p>
      )}
      {content && (
        <Markdown fadeIn streaming={isStreaming || partial}>
          {content}
        </Markdown>
      )}
      {questions?.length ? (
        <ChatQuestionCard questions={questions} answered={answered} answer={answer} />
      ) : null}
      {sources && <ChatSources sources={sources} />}
      {creatingArtifact && (
        <div className="mt-2">
          <ArtifactCardSkeleton />
        </div>
      )}
      {artifacts?.length ? (
        <div className="mt-2 space-y-2">
          {artifacts.map((artifact) => (
            <ArtifactCard
              key={`${artifact.id}-${artifact.version}`}
              artifact={artifact}
              onOpen={onOpenArtifact}
            />
          ))}
        </div>
      ) : null}
      {partial && <p className="mt-1 text-xs text-muted-foreground">Stopped</p>}
    </div>
  );
}
