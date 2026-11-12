'use client';

import { Plus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import type { ConversationType, MessageType } from '@nexus/types';

import { getMessages } from '@/api/ai';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCreateConversation,
  useDeleteConversation,
  useGetConversations,
  useUpdateConversation,
} from '@/hooks/useAi';
import { cn, downloadTextFile, slugify } from '@/lib/utils';

import { AIConversationActionsMenu } from './AIConversationActionsMenu';
import DeleteConfirmDialog from './DeleteConfirmDialog';

/** Pages through the whole transcript; the API returns it newest-page first. */
async function getAllMessages(conversationId: string): Promise<MessageType[]> {
  const all: MessageType[] = [];
  let cursor: number | undefined;

  for (;;) {
    const page = await getMessages(conversationId, {
      limit: 100,
      ...(cursor !== undefined ? { cursor } : {}),
    });
    all.push(...page.messages);

    if (!page.hasMore || page.nextCursor === null || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  }

  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function AIConversationList({
  projectId,
  selectedId,
  onSelect,
  onDeleted,
}: {
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const { data: conversations, isLoading } = useGetConversations({ variables: projectId });
  const createConversation = useCreateConversation(projectId);
  const updateConversation = useUpdateConversation(projectId);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [target, setTarget] = useState<ConversationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteConversation = useDeleteConversation(projectId);

  const startThread = async () => {
    const created = await createConversation.mutateAsync({ title: 'New conversation' });
    onSelect(created.id);
  };

  const startRename = (conversation: ConversationType) => {
    setDraftTitle(conversation.title);
    setRenamingId(conversation.id);
  };

  const cancelRename = () => {
    setRenamingId(null);
  };

  const commitRename = () => {
    if (!renamingId) return;

    const title = draftTitle.trim();
    const currentTitle = conversations?.find(
      (conversation) => conversation.id === renamingId,
    )?.title;

    setRenamingId(null);

    if (!title || title === currentTitle) return;

    updateConversation.mutate({ id: renamingId, input: { title } });
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  };

  const downloadConversation = async (conversation: ConversationType) => {
    try {
      const messages = await getAllMessages(conversation.id);
      const body = messages
        .filter((message) => message.role !== 'system')
        .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
        .join('\n\n');

      downloadTextFile({
        filename: `${slugify(conversation.title) || 'conversation'}.txt`,
        content: `${conversation.title}\n\n${body}\n`,
      });
    } catch (err) {
      console.error('[conversation] download failed', err);
    }
  };

  const confirmDelete = async () => {
    if (!target) return;

    const id = target.id;
    setError(null);

    try {
      await deleteConversation.mutateAsync(id);
      setTarget(null);
      onDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete chat.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <Button
        onClick={startThread}
        variant="outline"
        isLoading={createConversation.isPending}
        className="w-full"
      >
        <Plus className="size-4" /> New chat
      </Button>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </>
        ) : (
          conversations?.map((conversation) => {
            const isRenaming = conversation.id === renamingId;

            return (
              <div
                key={conversation.id}
                className={cn(
                  'group flex items-center gap-1 rounded-lg pr-1 hover:bg-accent',
                  conversation.id === selectedId && 'bg-accent',
                )}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={commitRename}
                    onKeyDown={handleRenameKeyDown}
                    maxLength={255}
                    aria-label="Chat title"
                    className="min-w-0 flex-1 border-b border-border bg-transparent px-3 py-2 text-sm outline-none"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => onSelect(conversation.id)}
                      className={cn(
                        'min-w-0 flex-1 cursor-pointer truncate px-3 py-2 text-left text-sm',
                        conversation.id === selectedId && 'font-medium',
                      )}
                    >
                      {conversation.title}
                    </button>
                    <AIConversationActionsMenu
                      onDownload={() => downloadConversation(conversation)}
                      onRename={() => startRename(conversation)}
                      onDelete={() => {
                        setError(null);
                        setTarget(conversation);
                      }}
                    />
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <DeleteConfirmDialog
        open={target !== null}
        close={() => setTarget(null)}
        confirmDelete={confirmDelete}
        error={error}
        isDeleting={deleteConversation.isPending}
        content="Are you sure you want to delete this chat?"
      />
    </div>
  );
}
