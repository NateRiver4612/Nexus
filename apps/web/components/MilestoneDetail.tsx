'use client';

import type { KickoffPlanType } from '@nexus/types';
import { Check, ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { cn, formatTimeMinutes, totalEstimatedMinutes } from '@/lib/utils';

import DifficultyIndicator from './DifficultyIndicator';

type Milestone = KickoffPlanType['milestones'][number];
type Task = Milestone['tasks'][number];

type TaskCardProps = {
  task: Task;
  selected: boolean;
  defaultOpen: boolean;
  onToggle: () => void;
};

const TaskCard = ({ task, selected, defaultOpen, onToggle }: TaskCardProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const stepsId = useId();
  const estimated = formatTimeMinutes(task.estimatedTimeMinutes);

  return (
    <div className="rounded-item border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={selected ? `Exclude ${task.title}` : `Include ${task.title}`}
          onClick={onToggle}
          className={cn(
            'mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors',
            selected
              ? 'border-action bg-action text-action-foreground'
              : 'border-border bg-surface text-transparent hover:border-foreground/40',
          )}
        >
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span
              className={cn(
                'min-w-0 flex-1 text-sm font-semibold leading-snug',
                selected ? 'text-foreground' : 'text-muted-foreground line-through',
              )}
            >
              {task.title}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <DifficultyIndicator difficulty={task.difficulty} />
              {estimated && (
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {estimated}
                </span>
              )}
            </div>
          </div>

          {task.description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
          )}

          {task.steps.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-controls={stepsId}
                className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-foreground transition-colors hover:text-action-hover"
              >
                {open ? 'Hide' : 'View'} {task.steps.length} execution steps
                {open ? (
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                )}
              </button>

              {/* Stays mounted and slides on grid-rows so the card height animates
                  instead of snapping when the steps toggle. */}
              <div
                id={stepsId}
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {task.steps.map((step, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                      >
                        <span className="select-none" aria-hidden="true">
                          •
                        </span>
                        <span className="min-w-0 flex-1">{step.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

type MilestoneDetailProps = {
  milestone: Milestone;
  /** Zero-based index — rendered as "Milestone 01". */
  index: number;
  isSelected: (taskIndex: number) => boolean;
  onToggleTask: (taskIndex: number) => void;
  /** Line-clamps the description for the height-constrained roadmap panel. */
  clampDescription?: boolean;
  /** Dialog mode hides the badge/title block — the dialog header owns it. */
  showHeader?: boolean;
  /** Turn off when an outer container (e.g. a dialog) owns the scrolling. */
  scrollTasks?: boolean;
  /** Rendered in the meta row, e.g. a "View details" trigger. */
  action?: ReactNode;
  className?: string;
};

/**
 * The milestone body shared by the pinned roadmap panel (clamped, scrollable
 * tasks) and its full-height details dialog.
 */
export const MilestoneDetail = ({
  milestone,
  index,
  isSelected,
  onToggleTask,
  clampDescription,
  showHeader = true,
  scrollTasks = true,
  action,
  className,
}: MilestoneDetailProps) => {
  const duration = formatTimeMinutes(totalEstimatedMinutes(milestone.tasks));
  const noneSelected = milestone.tasks.every((_, taskIndex) => !isSelected(taskIndex));

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {showHeader && (
        <div className="shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
              Milestone {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {milestone.tasks.length} tasks{duration && ` · ${duration}`}
            </span>
            {action && <div className="ml-auto">{action}</div>}
          </div>

          <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
            {milestone.title}
          </h3>
          {milestone.description && (
            <p
              className={cn(
                'mt-1 text-sm leading-relaxed text-muted-foreground',
                clampDescription && 'line-clamp-2',
              )}
            >
              {milestone.description}
            </p>
          )}
        </div>
      )}

      {noneSelected && (
        <p className="mt-4 flex items-start gap-2 rounded-control bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Every task is excluded — this milestone will be removed from the created plan.
          </span>
        </p>
      )}

      <div
        className={cn(
          'no-scrollbar mt-4 flex flex-col gap-3',
          scrollTasks && 'min-h-0 flex-1 overflow-y-auto pr-1',
        )}
      >
        {milestone.tasks.map((task, taskIndex) => (
          <TaskCard
            key={`${task.title}-${taskIndex}`}
            task={task}
            selected={isSelected(taskIndex)}
            defaultOpen={taskIndex === 0}
            onToggle={() => onToggleTask(taskIndex)}
          />
        ))}
      </div>
    </div>
  );
};
