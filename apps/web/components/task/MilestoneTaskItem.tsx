'use client';

import type { TaskType } from '@nexus/types';
import Link from 'next/link';

import { cn, formatTimeMinutes } from '@/lib/utils';

type MilestoneTaskItemProps = {
  task: TaskType;
  index: number;
  isCurrent: boolean;
};

/** One sibling task inside the milestone list — current task is highlighted. */
const MilestoneTaskItem = ({ task, index, isCurrent }: MilestoneTaskItemProps) => {
  const isDone = task.status === 'completed';

  return (
    <Link
      href={`/tasks/${task.id}`}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        'flex flex-col gap-2 rounded-item border p-3.5 transition-colors',
        isCurrent
          ? 'border-action bg-action text-action-foreground shadow-sm'
          : 'border-border/60 bg-surface-secondary text-foreground hover:border-border hover:bg-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded-pill px-2.5 py-0.5 text-[11px] font-bold',
            isCurrent
              ? 'bg-accent text-accent-foreground'
              : 'border border-border bg-surface text-muted-foreground',
          )}
        >
          Task {index + 1}
        </span>
        <span
          className={cn(
            'text-[11px] font-semibold tabular-nums',
            isCurrent ? 'text-action-foreground/70' : 'text-muted-foreground',
          )}
        >
          {formatTimeMinutes(task.estimatedTimeMinutes) ?? '—'}
        </span>
      </div>
      <p
        className={cn(
          'line-clamp-2 text-sm font-semibold leading-snug',
          isCurrent && 'text-action-foreground',
          !isCurrent && isDone && 'text-muted-foreground line-through',
        )}
      >
        {task.title}
      </p>
    </Link>
  );
};

export default MilestoneTaskItem;
