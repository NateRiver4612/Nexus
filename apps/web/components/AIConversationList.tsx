'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateConversation, useGetConversations } from '@/hooks/useAi';
import { cn } from '@/lib/utils';

export function AIConversationList({
  projectId,
  selectedId,
  onSelect,
}: {
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data: conversations, isLoading } = useGetConversations({ variables: projectId });
  const createConversation = useCreateConversation(projectId);

  const startThread = async () => {
    const created = await createConversation.mutateAsync({ title: 'New conversation' });
    onSelect(created.id);
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
          conversations?.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={cn(
                'w-full cursor-pointer truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-accent',
                conversation.id === selectedId && 'bg-accent font-medium',
              )}
            >
              {conversation.title}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
