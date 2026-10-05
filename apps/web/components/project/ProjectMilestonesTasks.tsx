import type { MilestoneWithTasksListType, MilestoneWithTasksType, TaskType } from '@nexus/types';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { useEffect, useRef, useState } from 'react';
import { isSortable } from '@dnd-kit/react/sortable';
import { Circle } from 'lucide-react';
import { move } from '@dnd-kit/helpers';
import SortableMilestoneItem from './SortableMilestoneItem';

/** Suffix appended to each milestone's task drop-zone droppable id. */
export const TASK_ZONE_SUFFIX = ':taskzone';

/** Map a drop target id back to its milestone id (zone ids are `${milestoneId}:taskzone`). */
function resolveMilestoneId(targetId: unknown): string | undefined {
  if (typeof targetId !== 'string') return undefined;
  return targetId.endsWith(TASK_ZONE_SUFFIX)
    ? targetId.slice(0, -TASK_ZONE_SUFFIX.length)
    : targetId;
}

/**
 * dnd-kit reports the drop target as the task drop-zone droppable when hovering
 * (empty) milestone space. `move()` looks targets up in `records` by id, so we
 * translate a `:taskzone` target back to its milestone id before handing the
 * event over — that makes `move()`'s empty-container path insert the task into
 * the right milestone at top/bottom based on pointer-vs-container-center.
 */
function withMilestoneTarget<T extends { operation: { target?: { id: unknown } | null } }>(
  event: T,
): T {
  const { operation } = event;

  if (!operation?.target) return event;

  const resolved = resolveMilestoneId(operation.target.id);

  if (resolved == null || resolved === operation.target.id) return event;

  console.log({
    resolved,
  });

  return {
    ...event,
    operation: { ...operation, target: { ...operation.target, id: resolved } },
  } as T;
}

type ProjectMilestonesTasksProps = {
  milestones: MilestoneWithTasksListType;
  className?: string;
  onContinueTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onMilestoneReorder?: (orderedMilestones: PlanMilestone[]) => void;
  onTaskReorder?: (milestone: PlanMilestone, orderedTasks: PlanTask[]) => void;
  onTaskMove?: (
    task: PlanTask,
    currentMilestone: PlanMilestone,
    toMilestone: PlanMilestone,
  ) => void;
  /**
   * Fired once at the end of any drag with the complete, authoritative final
   * milestone/task order. The page persists this directly — building the payload
   * from two partial `onTaskReorder` calls was corrupting it (a task could end
   * up in both the source and destination lists).
   */
  onOrderChange?: (orderedMilestones: PlanMilestone[]) => void;
};

export type PlanTask = Omit<TaskType, 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export type PlanMilestone = Omit<
  MilestoneWithTasksType,
  'projectId' | 'createdAt' | 'updatedAt' | 'tasks'
> & {
  tasks: PlanTask[];
};

export function isDone(tasks: PlanTask[]) {
  return tasks.length > 0 && tasks.every((t) => t.status === 'completed');
}

function buildTasksByMilestone(list: PlanMilestone[]) {
  return Object.fromEntries(
    list.map((m) => [String(m.id), [...m.tasks].sort((a, b) => a.position - b.position)]),
  ) as Record<string, PlanTask[]>;
}

const ProjectMilestonesTasks = ({
  milestones,
  className,
  onContinueTask,
  onMilestoneReorder,
  onTaskMove,
  onOrderChange,
}: ProjectMilestonesTasksProps) => {
  const [milestoneOrder, setMilestoneOrder] = useState<PlanMilestone[]>(() =>
    [...milestones].sort((a, b) => a.position - b.position),
  );

  const [tasksByMilestone, setTasksByMilestone] = useState<Record<string, PlanTask[]>>(() =>
    buildTasksByMilestone(milestones),
  );

  // The task currently being dragged — rendered in the DragOverlay. Without an
  // overlay, the source element stays in flow and follows the pointer, so its
  // own droppable shape travels with the cursor and cross-milestone targets
  // never register (collision resolves to the source itself).
  const [activeTask, setActiveTask] = useState<PlanTask | null>(null);

  // The milestone a task was in when the drag started. Captured ourselves at
  // dragStart instead of trusting `source.initialGroup` (the OptimisticSorting
  // plugin mutates group/initialGroup live during cross-group drags).
  const dragOriginRef = useRef<string | null>(null);

  useEffect(() => {
    setMilestoneOrder([...milestones].sort((a, b) => a.position - b.position));
    setTasksByMilestone(buildTasksByMilestone(milestones));
  }, [milestones]);

  const activeMilestone = milestoneOrder.find((m) => !isDone(tasksByMilestone[String(m.id)] ?? []));

  return (
    <Card className={cn('p-6 flex flex-col gap-4 bg-white', className)}>
      <h1 className="text-lg font-bold">Milestones & Tasks</h1>
      <DragDropProvider
        onDragStart={(event) => {
          const { source } = event.operation;

          if (!isSortable(source) || source.type !== 'task') return;

          const task = Object.values(tasksByMilestone)
            .flat()
            .find((t) => t.id === source.id);

          setActiveTask(task ?? null);

          dragOriginRef.current =
            Object.entries(tasksByMilestone).find(([, tasks]) =>
              tasks.some((t) => t.id === source.id),
            )?.[0] ?? null;
        }}

        onDragOver={(event) => {
          const { source } = event.operation;

          if (!isSortable(source) || source.type === 'milestone') return;

          // Keeps React's tree in sync with dnd-kit's live DOM moves as the task
          // crosses milestone boundaries mid-drag. This updates OUR state only —
          // never a parent callback, so it can't trigger setState-during-render.
          setTasksByMilestone((records) => move(records, withMilestoneTarget(event)));
        }}

        onDragEnd={(event) => {
          setActiveTask(null);

          if (event.canceled) return;

          const { source } = event.operation;

          if (!isSortable(source)) return;

          if (source.type === 'milestone') {
            // Compute outside the updater, then fire the parent callbacks after.
            const next = move(milestoneOrder, event);

            const changed =
              next.length !== milestoneOrder.length ||
              next.some((m, i) => m.id !== milestoneOrder[i]?.id);

            setMilestoneOrder(next);

            if (changed) {
              onMilestoneReorder?.(next);
              onOrderChange?.(next);
            }
            return;
          }

          // Task: onDragOver already moved the task inside `tasksByMilestone`,
          // so the final order is in the current state — no setState needed here.
          // Firing parent callbacks outside an updater avoids setState-during-render.
          const fromMilestoneId = dragOriginRef.current;

          dragOriginRef.current = null;

          if (fromMilestoneId == null) return;

          const toMilestoneId = Object.entries(tasksByMilestone).find(([, tasks]) =>
            tasks.some((t) => t.id === source.id),
          )?.[0];

          if (!toMilestoneId) return;

          const currentMilestone = milestoneOrder.find((m) => m.id === fromMilestoneId);
          const toMilestone = milestoneOrder.find((m) => m.id === toMilestoneId);

          if (toMilestoneId !== fromMilestoneId) {
            const movedTask = (tasksByMilestone[toMilestoneId] ?? []).find(
              (t) => t.id === source.id,
            );

            if (movedTask && currentMilestone && toMilestone) {
              onTaskMove?.(movedTask, currentMilestone, toMilestone);
            }
          }

          // Complete authoritative order after the move — a single snapshot for
          // the page to persist, so cross-milestone moves can't send a task in
          // two lists at once.
          onOrderChange?.(
            milestoneOrder.map((m) => ({
              ...m,
              tasks: tasksByMilestone[String(m.id)] ?? [],
            })),
          );
        }}
      >
        {milestoneOrder.map((milestone, index) => (
          <SortableMilestoneItem
            key={milestone.id}
            milestone={milestone}
            index={index}
            isActive={milestone === activeMilestone}
            tasks={tasksByMilestone[String(milestone.id)] ?? []}
            onContinueTask={onContinueTask}
          />
        ))}
        <DragOverlay>
          {activeTask && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Circle className="size-4 shrink-0 text-gray-300" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                  {activeTask.title}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DragDropProvider>
    </Card>
  );
};

export default ProjectMilestonesTasks;
