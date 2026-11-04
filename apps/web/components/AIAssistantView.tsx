'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useGetConversations } from '@/hooks/useAi';

import { ChatPanel } from './ChatPanel';
import { AIConversationList } from './AIConversationList';

/** The selected thread lives in `?c=` so a reload or shared link lands on the same thread. */
export function AssistantView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: conversations } = useGetConversations({ variables: projectId });

  const requested = searchParams.get('c');
  // The list is newest-activity first, so the default is the most recent thread. A `?c=` that
  // isn't in this project's list falls back to the same default instead of showing a 404.
  const selectedId =
    conversations?.find((conversation) => conversation.id === requested)?.id ??
    conversations?.[0]?.id ??
    null;

  const select = (id: string) => router.replace(`${pathname}?c=${id}`);

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_1fr] overflow-hidden rounded-xl border border-border bg-card">
      <aside className="border-r border-border min-h-0">
        <AIConversationList projectId={projectId} selectedId={selectedId} onSelect={select} />
      </aside>
      <section className="min-w-0 min-h-0">
        {selectedId ? (
          <ChatPanel key={selectedId} projectId={projectId} conversationId={selectedId} />
        ) : (
          <p className="pt-20 text-center text-sm text-muted-foreground">
            Start a new chat to ask about this project.
          </p>
        )}
      </section>
    </div>
  );
}
