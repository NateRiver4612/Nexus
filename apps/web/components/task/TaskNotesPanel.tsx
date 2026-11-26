'use client';

import type { TaskNoteType } from '@nexus/types';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import TaskNoteCard from './TaskNoteCard';

type TaskNotesPanelProps = {
  notes?: TaskNoteType[];
  isLoading?: boolean;
  /** The note currently open in the right workbench. */
  selectedNoteId?: string | null;
  onSelectNote: (note: TaskNoteType) => void;
  onAddNote: () => void;
  onDeleteNote: (note: TaskNoteType) => void;
};

/** Notes list for the left column: count, new-note action, selectable cards. */
const TaskNotesPanel = ({
  notes,
  isLoading,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
}: TaskNotesPanelProps) => {
  return (
    <Card className="flex flex-1 flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Notes
          </h2>
          <span className="flex size-5 items-center justify-center rounded-full bg-accent-secondary-soft text-[11px] font-bold text-accent-secondary-foreground">
            {notes?.length ?? 0}
          </span>
        </div>
        <Button type="button" size="sm" onClick={onAddNote}>
          <Plus className="size-3.5 text-accent" aria-hidden="true" />
          New note
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-item" />
          ))}
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <TaskNoteCard
              key={note.id}
              note={note}
              isSelected={note.id === selectedNoteId}
              onSelect={() => onSelectNote(note)}
              onDelete={() => onDeleteNote(note)}
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onAddNote}
        className="flex w-full items-center justify-center gap-1.5 rounded-item border-2 border-dashed border-border py-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add a note
      </button>

      <p className="mt-auto rounded-item border border-accent/60 bg-accent-soft/70 px-3.5 py-3 text-xs font-medium leading-relaxed text-accent-foreground">
        Click any note to edit in the center while checking off requirements on the right.
      </p>
    </Card>
  );
};

export default TaskNotesPanel;
