'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ArtifactRefType } from '@nexus/types';
import { Newspaper, PanelLeft } from 'lucide-react';
import { usePanelRef } from 'react-resizable-panels';

import { Button } from '@/components/ui/button';
import { ResizableGroup, ResizablePanel, ResizableSeparator } from '@/components/ui/resizable';
import { useGetConversations } from '@/hooks/useAi';
import { useArtifactPanel } from '@/hooks/useArtifactPanel';
import { useGetArtifacts } from '@/hooks/useArtifacts';

import { AIConversationList } from './AIConversationList';
import { ArtifactListPanel, ArtifactPanel } from './ArtifactPanel';
import { ChatPanel } from './ChatPanel';
import { toArtifactRefs } from '@/lib/artifact';

const LAYOUT_KEY = 'assistant-layout';

/** The selected thread lives in `?c=` so a reload or shared link lands on the same thread. */
export function AssistantView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: conversations } = useGetConversations({ variables: projectId });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarRef = usePanelRef();

  const {
    artifact,
    panelOpen,
    groupRef,
    artifactRef,
    artifactElRef,
    openArtifact,
    closePanel,
    togglePanel,
    clearSelection,
    onArtifactResize,
    onGroupLayoutChanged,
  } = useArtifactPanel({ layoutKey: LAYOUT_KEY, animated: true });

  const requested = searchParams.get('c');
  // The list is newest-activity first, so the default is the most recent thread. A `?c=` that
  // isn't in this project's list falls back to the same default instead of showing a 404.
  const selectedId =
    conversations?.find((conversation) => conversation.id === requested)?.id ??
    conversations?.[0]?.id ??
    null;
  const selectedTitle = conversations?.find(
    (conversation) => conversation.id === selectedId,
  )?.title;

  const { data: artifacts } = useGetArtifacts({
    projectId,
    conversationId: selectedId ?? undefined,
    enabled: Boolean(selectedId),
  });
  const chatArtifacts: ArtifactRefType[] = useMemo(
    () => toArtifactRefs(artifacts ?? []),
    [artifacts],
  );

  // The panel is conversation-scoped, so an artifact from the previous thread must not linger.
  useEffect(() => {
    clearSelection();
  }, [selectedId, clearSelection]);

  const select = (id: string) => router.replace(`${pathname}?c=${id}`);

  const handleDeleted = (id: string) => {
    if (id !== selectedId) return;

    const nextId = conversations?.find((conversation) => conversation.id !== id)?.id ?? null;
    router.replace(nextId ? `${pathname}?c=${nextId}` : pathname);
  };

  const toggleSidebar = () => {
    const panel = sidebarRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };

  return (
    <ResizableGroup
      orientation="horizontal"
      groupRef={groupRef}
      onLayoutChanged={onGroupLayoutChanged}
      className="h-full flex-1 min-h-full overflow-hidden rounded-xl border border-border bg-card"
    >
      <ResizablePanel
        id="sidebar"
        defaultSize="20"
        minSize={100}
        maxSize="35"
        collapsedThreshold={50}
        collapsible
        collapsedSize="0"
        panelRef={sidebarRef}
        onResize={(size) => setSidebarCollapsed(size.asPercentage < 1)}
        className="min-h-0"
      >
        <aside className="h-full min-h-0 border-r border-border">
          <AIConversationList
            projectId={projectId}
            selectedId={selectedId}
            onSelect={select}
            onDeleted={handleDeleted}
          />
        </aside>
      </ResizablePanel>

      <ResizableSeparator />

      <ResizablePanel id="chat" minSize="30" className="min-h-0">
        <section className="flex h-full min-h-0 flex-col">
          <header className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label={sidebarCollapsed ? 'Expand conversations' : 'Collapse conversations'}
              onClick={toggleSidebar}
            >
              <PanelLeft className="size-4" />
            </Button>
            {selectedTitle && (
              <p className="truncate flex-1 text-sm font-medium">{selectedTitle}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label={panelOpen ? 'Close artifacts' : 'Open artifacts'}
              aria-pressed={panelOpen}
              onClick={togglePanel}
              disabled={!selectedId}
            >
              <Newspaper className="size-4" />
            </Button>
          </header>
          <div className="min-h-0 flex-1">
            {selectedId ? (
              <ChatPanel
                key={selectedId}
                projectId={projectId}
                conversationId={selectedId}
                onOpenArtifact={openArtifact}
              />
            ) : (
              <p className="pt-20 text-center text-sm text-muted-foreground">
                Start a new chat to ask about this project.
              </p>
            )}
          </div>
        </section>
      </ResizablePanel>

      <ResizableSeparator />

      <ResizablePanel
        id="artifact"
        defaultSize="0"
        minSize={100}
        collapsedThreshold={50}
        collapsible
        collapsedSize="0"
        panelRef={artifactRef}
        elementRef={artifactElRef}
        onResize={onArtifactResize}
        style={{ overflow: 'hidden' }}
        className="min-h-0"
      >
        <section className="h-full min-h-0 border-l border-border">
          {panelOpen &&
            (artifact ? (
              <ArtifactPanel
                key={artifact.id}
                artifact={artifact}
                onClose={closePanel}
                onBack={clearSelection}
              />
            ) : (
              <ArtifactListPanel
                artifacts={chatArtifacts}
                onOpen={openArtifact}
                onClose={closePanel}
              />
            ))}
        </section>
      </ResizablePanel>
    </ResizableGroup>
  );
}
