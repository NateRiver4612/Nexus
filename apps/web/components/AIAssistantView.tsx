'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ChatArtifactType } from '@nexus/types';
import { Newspaper, PanelLeft } from 'lucide-react';
import { useGroupRef, usePanelRef, type Layout } from 'react-resizable-panels';

import { Button } from '@/components/ui/button';
import { ResizableGroup, ResizablePanel, ResizableSeparator } from '@/components/ui/resizable';
import { useGetConversations, useGetMessages } from '@/hooks/useAi';

import { AIConversationList } from './AIConversationList';
import { ArtifactListPanel, ArtifactPanel } from './ArtifactPanel';
import { ChatPanel } from './ChatPanel';
import { chatArtifactsOfMessages } from './ChatMessage';

const LAYOUT_KEY = 'assistant-layout';
const ARTIFACT_DEFAULT_SIZE = '30';

/** The selected thread lives in `?c=` so a reload or shared link lands on the same thread. */
export function AssistantView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: conversations } = useGetConversations({ variables: projectId });

  // Artifacts belong to the project, so the panel stays open when the thread changes.
  const [artifact, setArtifact] = useState<ChatArtifactType | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const groupRef = useGroupRef();
  const sidebarRef = usePanelRef();
  const artifactRef = usePanelRef();
  const artifactElRef = useRef<HTMLDivElement>(null);
  // Last expanded width (percentage) so reopening restores the user's size.
  const lastArtifactSize = useRef(ARTIFACT_DEFAULT_SIZE);
  const transitionTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  // Ignore the resize events our own slide produces; otherwise closing would unmount the
  // content the instant the panel hits 0 instead of when the animation ends.
  const animating = useRef(false);

  // Restore the saved split after mount. The artifact always starts collapsed — its open state
  // is in-memory, so a persisted non-zero size would restore an empty panel on reload.
  useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    if (!stored) return;
    try {
      groupRef.current?.setLayout({ ...(JSON.parse(stored) as Layout), artifact: 0 });
    } catch {
      // Corrupt or incompatible layout — keep the defaults.
    }
  }, [groupRef]);

  // Slide the artifact panel. The transition must live on the panel's outer element — the
  // `className`/`style` props go to an inner wrapper.
  const animateArtifact = (size: string) => {
    const el = artifactElRef.current;
    animating.current = true;
    if (el) el.style.transition = 'flex-grow 300ms ease-out';
    artifactRef.current?.resize(size);

    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => {
      if (el) el.style.transition = '';
      animating.current = false;
    }, 320);
  };

  // No selection opens the panel to the conversation's artifact list.
  const openPanel = () => {
    // Reopening during the close animation must cancel the pending unmount.
    window.clearTimeout(closeTimer.current);
    setArtifact(null);
    setPanelOpen(true);
    animateArtifact(lastArtifactSize.current);
  };

  const openArtifact = (next: ChatArtifactType) => {
    window.clearTimeout(closeTimer.current);
    setArtifact(next);
    setPanelOpen(true);
    animateArtifact(lastArtifactSize.current);
  };

  const closePanel = () => {
    // Capture the size now: the slide makes the panel's ResizeObserver report tiny
    // intermediate sizes, so reading it after the animation would reopen to a sliver.
    const size = artifactRef.current?.getSize().asPercentage;
    if (size && size >= 1) lastArtifactSize.current = String(size);

    animateArtifact('0');
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setPanelOpen(false);
      setArtifact(null);
    }, 320);
  };

  const togglePanel = () => {
    if (panelOpen) closePanel();
    else openPanel();
  };

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

  // Shares the query cache with `ChatPanel`, so the artifact list costs no extra request.
  const { data: messagePage } = useGetMessages({
    variables: { conversationId: selectedId ?? '' },
  });
  const chatArtifacts = useMemo(
    () => chatArtifactsOfMessages(messagePage?.messages ?? []),
    [messagePage],
  );

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
      onLayoutChanged={(layout) => {
        try {
          window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        } catch {
          // Storage unavailable — resizing still works for this session.
        }
      }}
      className="h-full min-h-0 overflow-hidden rounded-xl border border-border bg-card"
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
        onResize={(size) => {
          if (animating.current) return;
          const open = size.asPercentage >= 1;
          // Remember a width picked by dragging, not just one captured on close.
          if (open) lastArtifactSize.current = String(size.asPercentage);
          setPanelOpen(open);
          // Dragging the panel shut returns the next open to the list.
          if (!open) setArtifact(null);
        }}
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
                onBack={() => setArtifact(null)}
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
