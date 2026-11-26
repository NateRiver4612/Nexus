'use client';

import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  Columns2,
  MessageSquare,
  Newspaper,
  Plus,
  Square,
  type LucideIcon,
} from 'lucide-react';

import { ArtifactListPanel, ArtifactPanel } from '@/components/ArtifactPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResizableGroup, ResizablePanel, ResizableSeparator } from '@/components/ui/resizable';
import { useCreateConversation, useGetConversations } from '@/hooks/useAi';
import { useArtifactPanel } from '@/hooks/useArtifactPanel';
import { useGetArtifacts } from '@/hooks/useArtifacts';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { toArtifactRefs } from '@/lib/artifact';

type ArtifactViewMode = 'split' | 'replace';

const VIEW_MODE_KEY = 'task-artifact-view';

const VIEW_MODES: { value: ArtifactViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'split', label: 'Split view', icon: Columns2 },
  { value: 'replace', label: 'Replace view', icon: Square },
];

type TaskAssistantPanelProps = {
  projectId: string;
  /** Rendered at the end of the conversation header (e.g. the workbench tabs). */
  headerEnd?: ReactNode;
};

/** Project-scoped AI chat embedded in the task workbench. */
const TaskAssistantPanel = ({ projectId, headerEnd }: TaskAssistantPanelProps) => {
  const { data: conversations = [], isLoading } = useGetConversations({ variables: projectId });
  const createConversation = useCreateConversation(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Conversations belong to a project, so a different project starts a fresh selection.
  useEffect(() => {
    setSelectedId(null);
  }, [projectId]);

  const activeId =
    (conversations.some((conversation) => conversation.id === selectedId) ? selectedId : null) ??
    conversations[0]?.id ??
    null;
  const activeTitle = conversations.find((conversation) => conversation.id === activeId)?.title;

  // Split needs room for both panes; below the 2xl breakpoint the artifact always replaces
  // the chat, with no toggle to switch.
  const is2xl = useMediaQuery('(min-width: 1536px)');
  const [viewMode, setViewMode] = useState<ArtifactViewMode>('split');

  // Read the saved preference after mount so SSR and the first client render agree.
  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'split' || stored === 'replace') setViewMode(stored);
  }, []);

  const chooseMode = (mode: ArtifactViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // Storage unavailable — the choice still holds for this session.
    }
  };

  const effectiveMode: ArtifactViewMode = is2xl ? viewMode : 'replace';

  const {
    artifact,
    panelOpen,
    groupRef,
    artifactRef,
    artifactElRef,
    lastArtifactSize,
    openArtifact,
    closePanel,
    togglePanel,
    clearSelection,
    resetArtifact,
    onArtifactResize,
  } = useArtifactPanel({ animated: effectiveMode === 'split' });

  const { data: artifactRows } = useGetArtifacts({
    projectId,
    conversationId: activeId ?? undefined,
    enabled: Boolean(activeId),
  });
  const artifacts = useMemo(() => toArtifactRefs(artifactRows ?? []), [artifactRows]);

  // The artifact panel is conversation-scoped; closing on thread change also prevents the
  // replace overlay from hiding a freshly created conversation.
  useEffect(() => {
    resetArtifact();
  }, [activeId, resetArtifact]);

  const startNewChat = () => {
    createConversation.mutate(
      { title: 'New conversation' },
      { onSuccess: (conversation) => setSelectedId(conversation.id) },
    );
  };

  const emptyState = (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-muted-foreground">Ask the assistant about this task or project.</p>
      <Button
        type="button"
        size="sm"
        onClick={startNewChat}
        isLoading={createConversation.isPending}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Start a chat
      </Button>
    </div>
  );

  const chat = activeId ? (
    <ChatPanel
      key={activeId}
      projectId={projectId}
      conversationId={activeId}
      onOpenArtifact={openArtifact}
    />
  ) : (
    emptyState
  );

  const artifactsView = artifact ? (
    <ArtifactPanel
      key={artifact.id}
      artifact={artifact}
      onClose={closePanel}
      onBack={clearSelection}
    />
  ) : (
    <ArtifactListPanel artifacts={artifacts} onOpen={openArtifact} onClose={closePanel} />
  );

  const viewToggle = is2xl ? (
    <div
      role="group"
      aria-label="Artifact panel layout"
      className="flex shrink-0 items-center gap-0.5 rounded-pill border border-border bg-surface-secondary p-1"
    >
      {VIEW_MODES.map(({ value, label, icon: Icon }) => {
        const active = viewMode === value;

        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => chooseMode(value)}
            className={cn(
              'inline-flex items-center justify-center rounded-pill p-1.5 transition-colors',
              active
                ? 'bg-action text-action-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="min-w-0 max-w-64 justify-start">
                <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {isLoading ? 'Loading…' : (activeTitle ?? 'No chats yet')}
                </span>
                <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-64">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <DropdownMenuItem
                    key={conversation.id}
                    onSelect={() => setSelectedId(conversation.id)}
                    className="cursor-pointer"
                  >
                    <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                    {conversation.id === activeId && (
                      <Check className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No conversations yet</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={startNewChat}
            isLoading={createConversation.isPending}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            New chat
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {viewToggle}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={panelOpen ? 'Close artifacts' : 'Open artifacts'}
            aria-pressed={panelOpen}
            onClick={togglePanel}
            disabled={!activeId}
          >
            <Newspaper className="size-4" aria-hidden="true" />
          </Button>
          {headerEnd}
        </div>
      </div>

      {/* The chat always lives in the same tree (first resizable panel); replace/split only
          add the artifact panel or overlay. Moving the chat between trees would remount
          ChatPanel and drop the stream, scroll position, and message state. */}
      <div className="relative min-h-0 flex-1">
        <ResizableGroup orientation="horizontal" groupRef={groupRef} className="h-full min-h-0">
          <ResizablePanel id="chat" minSize="30" className="min-h-0">
            <div className="h-full min-h-0">{chat}</div>
          </ResizablePanel>

          {effectiveMode === 'split' && (
            <>
              <ResizableSeparator />

              <ResizablePanel
                id="artifact"
                // Read at registration: entering split mounts the panel already open, so no
                // effect-driven resize is needed during the mode transition.
                defaultSize={panelOpen ? lastArtifactSize.current : '0'}
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
                  {panelOpen && artifactsView}
                </section>
              </ResizablePanel>
            </>
          )}
        </ResizableGroup>

        {effectiveMode === 'replace' && panelOpen && (
          // Keep the chat mounted underneath so an in-flight reply keeps streaming.
          <div className="absolute inset-0 z-10 bg-card">{artifactsView}</div>
        )}
      </div>
    </div>
  );
};

// Props are stable (see TaskWorkbench), so hide/show tab switches skip re-rendering the chat.
export default memo(TaskAssistantPanel);
