'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SendHorizontal, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useGetMessages, useSendMessage } from '@/hooks/useAi';
import { ChatMessage, citationsOf } from './ChatMessage';

/** Mount with `key={conversationId}` so streaming state never leaks between threads. */
export function ChatPanel({
  projectId,
  conversationId,
}: {
  projectId: string;
  conversationId: string;
}) {
  const { data, isLoading } = useGetMessages({
    variables: { conversationId },
  });
  const { send, stop, pending, error, isStreaming } = useSendMessage({
    projectId,
    conversationId,
  });
  const [draft, setDraft] = useState('');

  console.log('Pending', pending);

  // Follow the stream, but only while the user is already at the bottom.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const messages = data?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending?.text, error]);

  const submit = () => {
    const content = draft.trim();
    if (!content || isStreaming) return;
    setDraft('');
    stickToBottom.current = true;
    void send(content);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 h-[50%] space-y-4 overflow-y-auto px-4 py-4"
      >
        {isLoading ? (
          <>
            <Skeleton className="ml-auto h-9 w-1/3 rounded-2xl" />
            <Skeleton className="h-16 w-2/3" />
          </>
        ) : messages.length === 0 && !pending ? (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            Ask anything about this project.
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              partial={message.metadata?.partial === true}
              sources={citationsOf(message.metadata)}
            />
          ))
        )}

        {pending && (
          <>
            <ChatMessage role="user" content={pending.content} />
            <ChatMessage
              role="assistant"
              content={pending.text}
              sources={pending.sources}
              activity={pending.activity}
              isStreaming
            />
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message the assistant… (Shift+Enter for a new line)"
          maxLength={20_000}
          className="max-h-40 min-h-10 resize-none outline-none"
          rows={1}
        />
        {isStreaming ? (
          <Button onClick={stop} variant="outline" size="md" aria-label="Stop generating">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={!draft.trim()} size="md" aria-label="Send message">
            <SendHorizontal className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
