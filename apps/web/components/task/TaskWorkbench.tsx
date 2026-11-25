'use client';

import { useCallback, useMemo, useState } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import TaskAssistantPanel from './TaskAssistantPanel';
import TaskNoteEditor from './TaskNoteEditor';
import {
  TaskWorkbenchModeContext,
  TaskWorkbenchTabs,
  type TaskWorkbenchMode,
} from './TaskWorkbenchTabs';

type TaskWorkbenchProps = {
  taskId: string;
  projectId: string;
  /** Active note; absent means a new, unsaved note. */
  noteId?: string;
  onNoteCreated?: (noteId: string) => void;
  onNoteDeleted?: () => void;
  onNewNote?: () => void;
  className?: string;
};

/** Center column of the task workbench: notes and the project assistant. */
const TaskWorkbench = ({
  taskId,
  projectId,
  noteId,
  onNoteCreated,
  onNoteDeleted,
  onNewNote,
  className,
}: TaskWorkbenchProps) => {
  const [mode, setMode] = useState<TaskWorkbenchMode>('note');
  // Mount the assistant on first open, then keep it alive so returning to the tab never
  // remounts ChatPanel (which would drop the stream, scroll position, and message state).
  const [assistantMounted, setAssistantMounted] = useState(false);

  const selectMode = useCallback((next: TaskWorkbenchMode) => {
    setMode(next);
    if (next === 'assistant') setAssistantMounted(true);
  }, []);

  const contextValue = useMemo(() => ({ mode, onSelect: selectMode }), [mode, selectMode]);
  // Stable element so the memoized panes' props don't change when the active tab does.
  const headerTabs = useMemo(() => <TaskWorkbenchTabs />, []);

  return (
    <TaskWorkbenchModeContext.Provider value={contextValue}>
      <Card
        className={cn('relative h-full min-h-[70vh] overflow-hidden p-0 lg:min-h-0', className)}
      >
        {/* Both tabs stay mounted and overlap; `invisible` hides one without changing its size,
            so the split panel isn't measured at zero width and the chat never remounts. */}
        <div
          className={cn(
            'absolute inset-0 min-h-0',
            mode !== 'note' && 'invisible pointer-events-none',
          )}
        >
          <TaskNoteEditor
            key={noteId ?? 'new'}
            taskId={taskId}
            noteId={noteId}
            onCreated={onNoteCreated}
            onDeleted={onNoteDeleted}
            onNewNote={onNewNote}
            headerEnd={headerTabs}
            className="h-full"
          />
        </div>

        {assistantMounted && (
          <div
            className={cn(
              'absolute inset-0 min-h-0',
              mode !== 'assistant' && 'invisible pointer-events-none',
            )}
          >
            <TaskAssistantPanel projectId={projectId} headerEnd={headerTabs} />
          </div>
        )}
      </Card>
    </TaskWorkbenchModeContext.Provider>
  );
};

export default TaskWorkbench;
