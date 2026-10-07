import { useSortable } from '@dnd-kit/react/sortable';
import {
  isDone,
  TASK_ZONE_SUFFIX,
  type PlanMilestone,
  type PlanTask,
} from './ProjectMilestonesTasks';
import MilestoneStatusIcon from '../MilestoneStatusIcon';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/react';
import DragHandle from '../DragHandle';
import { Check, Circle, Play, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

const SortableTaskRow = ({
  task,
  index,
  isCurrent,
  milestone,
  currentMilestoneId,
  onContinueTask,
  onActivateTask,
  onReopenTask,
}: {
  task: PlanTask;
  index: number;
  currentMilestoneId: string;
  milestone: PlanMilestone;
  isCurrent: boolean;
  onContinueTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onActivateTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onReopenTask?: (milestone: PlanMilestone, task: PlanTask) => void;
}) => {
  const sortable = useSortable({
    id: task.id,
    index,
    type: 'task',
    accept: `task`,
    group: currentMilestoneId,
  });

  const router = useRouter();

  const handleOnClick = () => {
    router.push(`/tasks/${task.id}`);
  };

  const done = task.status === 'completed';

  // A completed task always renders as the completed row (green check +
  // strikethrough + Re-open) — never as the "Current task" card, even if
  // `currentTaskId` still points at it transiently before the refetch lands.
  if (isCurrent && !done) {
    return (
      <div ref={sortable.ref} className={cn(sortable.isDragging && 'z-10 opacity-60')}>
        <div className="mx-2 my-3 rounded-lg border-2 border-primary bg-blue-50/60 p-3">
          <div className="flex items-center gap-2">
            <DragHandle handleRef={sortable.handleRef} className="mt-1" />
            <div
              onClick={handleOnClick}
              className="flex cursor-pointer size-6 shrink-0 items-center justify-center rounded-full bg-primary"
            >
              <div className="size-2 rounded-full bg-white" />
            </div>

            <div
              onClick={handleOnClick}
              className="w-full cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] mb-0! font-semibold uppercase tracking-wide text-primary">
                    Current task
                  </p>
                  <p className="truncate font-semibold text-gray-900">{task.title}</p>
                </div>
                {task.estimatedTimeMinutes != null && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {task.estimatedTimeMinutes} min left
                  </span>
                )}
              </div>

              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onContinueTask?.(milestone, task);
                }}
                className="shrink-0"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={sortable.ref}
      onClick={handleOnClick}
      className={cn(
        'group flex cursor-pointer items-center gap-2 py-2 pl-10 pr-2',
        sortable.isDragging && 'z-10 bg-white shadow-sm opacity-60',
      )}
    >
      <DragHandle handleRef={sortable.handleRef} />
      {done ? (
        <Check className="size-4 shrink-0 text-green-600" />
      ) : (
        <Circle className="size-4 shrink-0 text-gray-300" />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          done ? 'text-gray-400 line-through' : 'text-gray-900',
        )}
      >
        {task.title}
      </span>
      {done ? (
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onReopenTask?.(milestone, task);
          }}
          className="shrink-0 gap-1 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          <RotateCcw size={12} />
          Re-open
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onActivateTask?.(milestone, task);
          }}
          className="shrink-0 gap-1 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Play size={12} />
          Activate
        </Button>
      )}
    </div>
  );
};

const SortableMilestoneItem = ({
  milestone,
  index,
  isActive,
  tasks,
  onContinueTask,
  currentTaskId,
  onActivateTask,
  onReopenTask,
}: {
  milestone: PlanMilestone;
  index: number;
  isActive: boolean;
  tasks: PlanTask[];
  onContinueTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  currentTaskId?: string | null;
  onActivateTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onReopenTask?: (milestone: PlanMilestone, task: PlanTask) => void;
}) => {
  const currentMilestoneId = String(milestone.id);

  const sortable = useSortable({
    id: currentMilestoneId,
    index,
    type: 'milestone',
    accept: 'milestone',
  });

  // Task drop zone covering the milestone's task body — lets a task be dropped
  // into *empty* space of the milestone. Low collisionPriority so hovering an
  // actual task row (default Normal) still resolves to that row.
  const taskZone = useDroppable({
    id: `${currentMilestoneId}${TASK_ZONE_SUFFIX}`,
    accept: 'task',
    collisionPriority: 1, // CollisionPriority.Low
  });

  const done = isDone(tasks);
  const doneCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <Accordion
      ref={sortable.ref}
      type="single"
      collapsible
      defaultValue={isActive ? `milestone-${milestone.id}` : undefined}
      className={cn('rounded-lg shadow border border-gray-200')}
    >
      <AccordionItem
        value={`milestone-${milestone.id}`}
        className={cn(
          'border-b-0 w-full',
          sortable.isDragging && 'z-10 bg-white shadow-sm opacity-60',
        )}
      >
        <div
          className={cn('flex rounded-t-lg gap-1 w-full px-3 items-center', {
            'bg-primary/10': isActive,
          })}
        >
          <DragHandle
            handleRef={sortable.handleRef}
            className={cn('', {
              'text-primary': isActive,
            })}
          />
          <AccordionTrigger className="hover:underlined-none bg">
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <div className="flex min-w-0 items-center gap-2">
                <div>
                  <MilestoneStatusIcon done={done} isActive={isActive} />
                </div>
                <span
                  className={cn(
                    'truncate text-sm font-medium',
                    done ? 'text-gray-900' : 'text-gray-400',
                    {
                      'text-primary': isActive,
                    },
                  )}
                >
                  {milestone.title}
                </span>
              </div>
              <span
                className={cn('shrink-0 text-xs text-gray-400', {
                  'text-primary': isActive,
                })}
              >
                {doneCount}/{tasks.length} tasks
              </span>
            </div>
          </AccordionTrigger>
        </div>

        <div
          ref={taskZone.ref}
          className={cn(
            'flex flex-col',
            taskZone.isDropTarget &&
              'rounded-b-lg outline-2 outline-dashed outline-primary bg-primary/5',
          )}
        >
          <AccordionContent className="pb-2">
            {tasks.map((task, taskIndex) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                index={taskIndex}
                currentMilestoneId={currentMilestoneId}
                milestone={milestone}
                isCurrent={task.id === currentTaskId}
                onContinueTask={onContinueTask}
                onActivateTask={onActivateTask}
                onReopenTask={onReopenTask}
              />
            ))}
          </AccordionContent>
        </div>
      </AccordionItem>
    </Accordion>
  );
};

export default SortableMilestoneItem;
