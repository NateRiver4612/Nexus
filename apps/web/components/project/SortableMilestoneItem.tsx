import { useSortable } from '@dnd-kit/react/sortable';
import { Check, Circle, Pin, Play, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn, formatTimeMinutes } from '@/lib/utils';

import DifficultyIndicator from '../DifficultyIndicator';
import DragHandle from '../DragHandle';
import type { PlanMilestone, PlanTask } from './ProjectMilestonesTasks';

type SortableTaskRowProps = {
  task: PlanTask;
  index: number;
  currentMilestoneId: string;
  milestone: PlanMilestone;
  isCurrent: boolean;
  onContinueTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onActivateTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onReopenTask?: (milestone: PlanMilestone, task: PlanTask) => void;
};

export const SortableTaskRow = ({
  task,
  index,
  currentMilestoneId,
  milestone,
  isCurrent,
  onContinueTask,
  onActivateTask,
  onReopenTask,
}: SortableTaskRowProps) => {
  const sortable = useSortable({
    id: task.id,
    index,
    type: 'task',
    accept: 'task',
    group: currentMilestoneId,
  });
  const router = useRouter();
  const done = task.status === 'completed';
  const estimated = formatTimeMinutes(task.estimatedTimeMinutes);
  const current = isCurrent && !done;

  return (
    <div
      ref={sortable.ref}
      className={cn(sortable.isDragging && 'z-10 opacity-60')}
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <div
        className={cn(
          'group flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all',
          current
            ? 'border-action bg-primary-subtle shadow-xs'
            : done
              ? 'border-border/60 bg-surface-secondary'
              : 'border-border bg-surface hover:bg-surface-secondary',
        )}
      >
        <DragHandle handleRef={sortable.handleRef} className="mt-0.5" />

        <button
          type="button"
          aria-label={done ? `Reopen ${task.title}` : `Open requirements for ${task.title}`}
          onClick={(event) => {
            event.stopPropagation();

            if (done) {
              onReopenTask?.(milestone, task);
              return;
            }

            onContinueTask?.(milestone, task);
          }}
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
            done
              ? 'border-action bg-action text-accent'
              : current
                ? 'border-2 border-action bg-surface'
                : 'border-border bg-surface hover:border-action',
          )}
        >
          {done && <Check className="size-3" />}
          {!done && current && <span className="size-1.5 rounded-full bg-action" />}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          {current && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-action px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Current task
            </span>
          )}
          <p
            className={cn(
              'text-sm font-bold leading-snug',
              done ? 'text-muted-foreground line-through' : 'text-foreground',
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <DifficultyIndicator difficulty={task.difficulty} />
            {estimated && (
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {estimated}
              </span>
            )}
          </div>

          {!done && (
            <div className="flex items-center gap-1.5">
              {!current && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 px-2.5 text-[11px]"
                  onClick={(event) => {
                    event.stopPropagation();
                    onActivateTask?.(milestone, task);
                  }}
                >
                  <Pin className="size-3" />
                  Focus
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="gap-1 px-3 text-[11px]"
                onClick={(event) => {
                  event.stopPropagation();
                  onContinueTask?.(milestone, task);
                }}
              >
                <Play className="size-3 fill-current text-accent" />
                Continue
              </Button>
            </div>
          )}

          {done && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1 px-2.5 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onReopenTask?.(milestone, task);
              }}
            >
              <RotateCcw className="size-3" />
              Re-open
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const TaskDragPreview = ({ task }: { task: PlanTask }) => {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-lg">
      <div className="flex items-center gap-3">
        <Circle className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
          {task.title}
        </span>
      </div>
    </div>
  );
};

export default SortableTaskRow;
