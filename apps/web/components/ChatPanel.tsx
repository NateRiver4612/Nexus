'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import type { ChatArtifactType } from '@nexus/types';
import { Paperclip, SendHorizontal, Square } from 'lucide-react';
import { fileSchema } from '@nexus/zod-schemas';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useGetMessages, useSendMessage, useUploadAttachment } from '@/hooks/useAi';
import { deleteAttachment } from '@/api/attachments';
import { ChatMessage, artifactsOf, attachmentsOf, citationsOf } from './ChatMessage';
import { ChatAttachmentCardSkeleton, ChatAttachmentChip } from './ChatAttachmentChip';

const ACCEPTED_EXTENSIONS =
  '.pdf,.docx,.xlsx,.csv,.json,.txt,.md,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav,.webm,.ogg,.flac';

/** A file being attached to the next message, before it is sent. */
type DraftAttachment = {
  key: string;
  file: File;
  name: string;
  mimeType: string;
  size: number;
  status: 'uploading' | 'ready' | 'failed';
  attachmentId?: string;
  errorMessage?: string;
};

/** Mount with `key={conversationId}` so streaming state never leaks between threads. */
export function ChatPanel({
  projectId,
  conversationId,
  onOpenArtifact,
}: {
  projectId: string;
  conversationId: string;
  /** Opens the artifact panel (both on card click and when the assistant saves one). */
  onOpenArtifact?: (artifact: ChatArtifactType) => void;
}) {
  const { data, isLoading } = useGetMessages({
    variables: { conversationId },
  });
  const { send, stop, pending, error, isStreaming } = useSendMessage({
    projectId,
    conversationId,
    onArtifactCreated: onOpenArtifact,
  });
  const uploadAttachment = useUploadAttachment(conversationId);

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Follow the stream, but only while the user is already at the bottom.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messages = data?.messages ?? [];

  const isUploading = attachments.some((attachment) => attachment.status === 'uploading');

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending?.text, error]);

  const updateAttachment = (key: string, patch: Partial<DraftAttachment>) =>
    setAttachments((current) =>
      current.map((attachment) =>
        attachment.key === key ? { ...attachment, ...patch } : attachment,
      ),
    );

  const removeAttachment = (attachment: DraftAttachment) => {
    setAttachments((current) => current.filter((entry) => entry.key !== attachment.key));

    // A ready/failed upload already has a server row (and maybe an S3 object); clean it up.
    if (attachment.attachmentId) {
      void deleteAttachment(conversationId, attachment.attachmentId).catch(() => undefined);
    }
  };

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const entries: DraftAttachment[] = incoming.map((file) => {
      const base = {
        key: crypto.randomUUID(),
        file,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      };

      const parsed = fileSchema.safeParse(file);
      if (!parsed.success) {
        return {
          ...base,
          status: 'failed',
          errorMessage: parsed.error.issues[0]?.message ?? 'Unsupported file.',
        };
      }
      return { ...base, status: 'uploading' };
    });

    setAttachments((current) => [...current, ...entries]);

    // Valid files upload immediately; the chip flips to ready/failed when the server confirms.
    for (const entry of entries) {
      if (entry.status !== 'uploading') continue;

      uploadAttachment(entry.file, (attachmentId) => updateAttachment(entry.key, { attachmentId }))
        .then((result) => {
          if (result.status === 'ready') {
            updateAttachment(entry.key, { status: 'ready', attachmentId: result.id });
          } else {
            updateAttachment(entry.key, {
              status: 'failed',
              errorMessage: result.errorMessage ?? 'Could not read the file.',
            });
          }
        })
        .catch((uploadError) =>
          updateAttachment(entry.key, {
            status: 'failed',
            errorMessage: uploadError instanceof Error ? uploadError.message : 'Upload failed.',
          }),
        );
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  };

  const submit = () => {
    const content = draft.trim();
    if (!content || isStreaming || isUploading) return;

    const ready = attachments
      .filter((attachment) => attachment.status === 'ready' && attachment.attachmentId)
      .map((attachment) => ({
        id: attachment.attachmentId as string,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
      }));

    setDraft('');
    setAttachments([]);
    stickToBottom.current = true;
    void send(content, ready);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onDragOver={(event) => {
        event.preventDefault();
        if (!isDragging) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
      }}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <p className="text-sm font-medium text-primary-foreground">Drop files to attach</p>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 h-[50%] space-y-8 overflow-y-auto px-4 py-4"
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
              attachments={attachmentsOf(message.metadata)}
              sources={citationsOf(message.metadata)}
              artifacts={artifactsOf(message.metadata)}
              onOpenArtifact={onOpenArtifact}
            />
          ))
        )}

        {pending && (
          <>
            <ChatMessage role="user" content={pending.content} attachments={pending.attachments} />
            <ChatMessage
              role="assistant"
              content={pending.text}
              sources={pending.sources}
              artifacts={pending.artifacts}
              creatingArtifact={pending.creatingArtifact}
              activity={pending.activity}
              isStreaming
              onOpenArtifact={onOpenArtifact}
            />
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-border p-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((attachment) =>
              attachment.status === 'uploading' ? (
                <ChatAttachmentCardSkeleton key={attachment.key} />
              ) : (
                <ChatAttachmentChip
                  key={attachment.key}
                  name={attachment.name}
                  mimeType={attachment.mimeType}
                  size={attachment.size}
                  status={attachment.status}
                  errorMessage={attachment.errorMessage}
                  onRemove={() => removeAttachment(attachment)}
                />
              ),
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach files"
          >
            <Paperclip className="size-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files);
              if (files.length > 0) {
                event.preventDefault();
                addFiles(files);
              }
            }}
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
            <Button
              onClick={submit}
              disabled={!draft.trim() || isUploading}
              size="md"
              aria-label="Send message"
            >
              <SendHorizontal className="size-4" />
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}
