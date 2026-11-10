import type { ChatCitationType, MessageType } from '@nexus/types';
import { chatCitationsSchema } from '@nexus/zod-schemas';

import { ChatSources } from './ChatSources';
import { Markdown } from './Markdown';

type ChatMessageProps = {
  role: MessageType['role'];
  content: string;
  /** The reply was cut short (the user stopped it, or the provider failed mid-stream). */
  partial?: boolean;
  isStreaming?: boolean;
  sources?: ChatCitationType[];
  /** The tool running right now, shown while the reply is still being produced. */
  activity?: string | null;
};

/** Citations are stored in `metadata.citations`; anything malformed is simply not shown. */
export function citationsOf(metadata: MessageType['metadata']): ChatCitationType[] {
  const parsed = chatCitationsSchema.safeParse(metadata?.citations);
  return parsed.success ? parsed.data : [];
}

export function ChatMessage({
  role,
  content,
  partial,
  isStreaming,
  sources,
  activity,
}: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl bg-secondary px-4 py-2 text-sm whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[90%]">
      {activity ? (
        <p className="mb-1 text-sm text-muted-foreground">{activity}</p>
      ) : (
        !content && isStreaming && <p className="text-sm text-muted-foreground">Thinking…</p>
      )}
      {content && <Markdown>{content}</Markdown>}
      {sources && <ChatSources sources={sources} />}
      {partial && <p className="mt-1 text-xs text-muted-foreground">Stopped</p>}
    </div>
  );
}
