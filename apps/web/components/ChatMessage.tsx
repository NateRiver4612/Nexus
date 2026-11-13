import type { ChatArtifactType, ChatCitationType, MessageType } from '@nexus/types';
import { chatArtifactsSchema, chatCitationsSchema } from '@nexus/zod-schemas';

import { ArtifactCard, ArtifactCardSkeleton } from './ArtifactCard';
import { ChatSources } from './ChatSources';
import { Markdown } from './Markdown';

type ChatMessageProps = {
  role: MessageType['role'];
  content: string;
  /** The reply was cut short (the user stopped it, or the provider failed mid-stream). */
  partial?: boolean;
  isStreaming?: boolean;
  sources?: ChatCitationType[];
  artifacts?: ChatArtifactType[];
  /** `create_artifact` is running — show a skeleton card in its place. */
  creatingArtifact?: boolean;
  onOpenArtifact?: (artifact: ChatArtifactType) => void;
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

/**
 * Every artifact a conversation has produced, newest message first. An artifact re-saved with
 * more content bumps its `version`, so only the highest version per id is kept.
 */
export function chatArtifactsOfMessages(messages: MessageType[]): ChatArtifactType[] {
  const byId = new Map<string, ChatArtifactType>();

  // Messages arrive oldest-first; reverse them so the list reads newest-first.
  for (const message of [...messages].reverse()) {
    for (const artifact of artifactsOf(message.metadata)) {
      const known = byId.get(artifact.id);
      if (!known || artifact.version > known.version) byId.set(artifact.id, artifact);
    }
  }

  return [...byId.values()];
}

export function ChatMessage({
  role,
  content,
  partial,
  artifacts,
  creatingArtifact,
  onOpenArtifact,
  isStreaming,
  sources,
  activity,
}: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[90%] rounded-2xl bg-secondary px-4 py-2 text-sm whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {activity ? (
        <p className="mb-1 text-sm text-muted-foreground">{activity}</p>
      ) : (
        !content && isStreaming && <p className="text-sm text-muted-foreground">Thinking…</p>
      )}
      {content && <Markdown fadeIn>{content}</Markdown>}
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
