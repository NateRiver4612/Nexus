import type { ProjectStatusType, TaskStatusEnum } from '@nexus/types';
import type { HTMLAttributes } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type StatusType = ProjectStatusType | TaskStatusEnum;

export type StatusSize = 'sm' | 'md' | 'lg';

type StatusProps = HTMLAttributes<HTMLSpanElement> & {
  status: StatusType;
  size?: StatusSize;
  /** Optional tooltip text explaining why the status is what it is. */
  explain?: string;
};

const statusStyles: Record<StatusType, { label: string; className: string; dotClassName: string }> =
  {
    completed: {
      label: 'Completed',
      className: 'border-primary/30 bg-primary-soft text-primary-foreground',
      dotClassName: 'bg-primary',
    },
    active: {
      label: 'Active',
      className: 'border-transparent bg-primary text-primary-foreground',
      dotClassName: 'bg-primary-foreground',
    },
    draft: {
      label: 'Draft',
      className: 'border-border bg-muted text-muted-foreground',
      dotClassName: 'bg-muted-foreground',
    },
    paused: {
      label: 'Paused',
      className: 'border-accent-tertiary/30 bg-accent-soft text-accent-foreground',
      dotClassName: 'bg-accent-tertiary',
    },
    archived: {
      label: 'Archived',
      className:
        'border-accent-secondary/30 bg-accent-secondary-soft text-accent-secondary-foreground',
      dotClassName: 'bg-accent-secondary',
    },
    in_progress: {
      label: 'In Progress',
      className: 'border-primary/30 bg-primary-soft text-primary-foreground',
      dotClassName: 'bg-primary',
    },
    todo: {
      label: 'Todo',
      className: 'border-border bg-surface-secondary text-muted-foreground',
      dotClassName: 'bg-muted-foreground',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'border-border bg-muted text-muted-foreground',
      dotClassName: 'bg-muted-foreground',
    },
    reopen: {
      label: 'Re-open',
      className: 'border-destructive/25 bg-destructive/10 text-destructive',
      dotClassName: 'bg-destructive',
    },
  };

const sizeStyles: Record<StatusSize, { container: string; dot: string }> = {
  sm: {
    container: 'gap-1.5 px-2.5 py-1 text-[11px]',
    dot: 'size-1.5',
  },
  md: {
    container: 'gap-2 px-3 py-1 text-xs',
    dot: 'size-2',
  },
  lg: {
    container: 'gap-2.5 px-4 py-1.5 text-sm',
    dot: 'size-2.5',
  },
};

/** Why a task is in a given status — shown as the Status tooltip on the task page. */
export function taskStatusExplain(status: TaskStatusEnum): string {
  switch (status) {
    case 'todo':
      return 'Not started yet.';
    case 'in_progress':
      return "This is the current task you're working on.";
    case 'paused':
      return 'You were working on this before — it paused because you switched to another task. Activate it to resume.';
    case 'reopen':
      return 'This task was completed but has been re-opened; its steps and definition-of-done stay as they were.';
    case 'completed':
      return 'All definition-of-done items are satisfied — this task is done.';
    case 'cancelled':
      return 'This task was dropped / is no longer being pursued.';
  }
}

export const Status = ({ status, size = 'md', className = '', explain, ...props }: StatusProps) => {
  const { label, className: variantClass, dotClassName } = statusStyles[status];

  const { container, dot } = sizeStyles[size];

  const pill = (
    <span
      role="status"
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-pill border font-bold ${container} ${variantClass} ${className}`}
      {...props}
    >
      <span aria-hidden="true" className={`rounded-full ${dot} ${dotClassName}`} />
      {label}
    </span>
  );

  if (!explain) {
    return pill;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent side="right">{explain}</TooltipContent>
    </Tooltip>
  );
};

export default Status;
