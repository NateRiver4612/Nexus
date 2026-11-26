'use client';

import type { TaskNoteType } from '@nexus/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { Trash2 } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

type TaskNoteCardProps = {
  note: TaskNoteType;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

/** One selectable note in the left column; delete stays hidden until hover/focus. */
const TaskNoteCard = ({ note, isSelected, onSelect, onDelete }: TaskNoteCardProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'group flex cursor-pointer flex-col gap-2 rounded-item border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70',
        isSelected
          ? 'border-action bg-primary-subtle'
          : 'border-border bg-surface-secondary/60 hover:bg-surface-secondary',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {note.title}
        </p>
        <button
          type="button"
          aria-label={`Delete ${note.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="shrink-0 cursor-pointer rounded-full p-1 text-muted-foreground opacity-0 transition-colors hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <span className="text-[11px] text-muted-foreground">
        Edited {formatDistanceToNowStrict(new Date(note.updatedAt), { addSuffix: true })}
      </span>
    </div>
  );
};

export default TaskNoteCard;
