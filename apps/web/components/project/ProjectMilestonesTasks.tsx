'use client';

import type {
  KickoffPlanType,
  MilestoneWithTasksListType,
  MilestoneWithTasksType,
  TaskType,
} from '@nexus/types';
import { move } from '@dnd-kit/helpers';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { Check, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetProjectDeliverables } from '@/hooks/useDeliverables';
import { cn, formatTimeMinutes, totalEstimatedMinutes } from '@/lib/utils';

import SortableTaskRow, { TaskDragPreview } from './SortableMilestoneItem';

export type PlanTask = Omit<TaskType, 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export type PlanMilestone = Omit<
  MilestoneWithTasksType,
  'projectId' | 'createdAt' | 'updatedAt' | 'tasks'
> & {
  tasks: PlanTask[];
};

type ProjectMilestonesTasksProps = {
  projectId: string;
  keyTopics?: KickoffPlanType['summary']['keyTopics'];
  milestones?: MilestoneWithTasksListType;
  className?: string;
  isLoading?: boolean;
  onContinueTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onOrderChange?: (orderedMilestones: PlanMilestone[]) => void;
  currentTaskId?: string | null;
  onActivateTask?: (milestone: PlanMilestone, task: PlanTask) => void;
  onReopenTask?: (milestone: PlanMilestone, task: PlanTask) => void;
};

const STAGE_STYLES = [
  { background: 'bg-primary', foreground: 'text-primary-foreground' },
  { background: 'bg-accent', foreground: 'text-accent-foreground' },
  {
    background: 'bg-accent-secondary',
    foreground: 'text-accent-secondary-foreground',
  },
  {
    background: 'bg-accent-tertiary-soft',
    foreground: 'text-accent-tertiary-foreground',
  },
  { background: 'bg-primary-soft', foreground: 'text-primary-foreground' },
  { background: 'bg-accent-soft', foreground: 'text-accent-foreground' },
] as const;

function buildTasksByMilestone(list: PlanMilestone[]) {
  return Object.fromEntries(
    list.map((milestone) => [
      String(milestone.id),
      [...milestone.tasks].sort((a, b) => a.position - b.position),
    ]),
  ) as Record<string, PlanTask[]>;
}

function findDefaultMilestoneId(list: PlanMilestone[], currentTaskId?: string | null) {
  const ordered = [...list].sort((a, b) => a.position - b.position);
  const current = currentTaskId
    ? ordered.find((milestone) => milestone.tasks.some((task) => task.id === currentTaskId))
    : undefined;
  const firstIncomplete = ordered.find((milestone) =>
    milestone.tasks.some((task) => task.status !== 'completed'),
  );

  return String((current ?? firstIncomplete ?? ordered[0])?.id ?? '');
}

const ProjectMilestonesTasksSkeleton = ({ className }: { className?: string }) => {
  return (
    <section className={cn('space-y-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-48 rounded-pill" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-32 rounded-card" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-12">
        <Skeleton className="h-96 rounded-card xl:col-span-7" />
        <Skeleton className="h-96 rounded-card xl:col-span-5" />
      </div>
    </section>
  );
};

export const ProjectMilestonesTasks = ({
  projectId,
  keyTopics = [],
  milestones = [],
  className,
  isLoading,
  onContinueTask,
  onOrderChange,
  currentTaskId,
  onActivateTask,
  onReopenTask,
}: ProjectMilestonesTasksProps) => {
  const orderedMilestones = [...milestones].sort((a, b) => a.position - b.position);
  const [tasksByMilestone, setTasksByMilestone] = useState<Record<string, PlanTask[]>>(() =>
    buildTasksByMilestone(orderedMilestones),
  );
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(() =>
    findDefaultMilestoneId(orderedMilestones, currentTaskId),
  );
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [activeTask, setActiveTask] = useState<PlanTask | null>(null);
  const dragOriginRef = useRef<string | null>(null);

  const { data: deliverableData } = useGetProjectDeliverables({ variables: projectId });
  const deliverables = Array.isArray(deliverableData) ? deliverableData : [];
  const primaryDeliverable = deliverables[0];

  useEffect(() => {
    setTasksByMilestone(buildTasksByMilestone(orderedMilestones));
    setSelectedMilestoneId((current) => {
      if (orderedMilestones.some((milestone) => String(milestone.id) === current)) {
        return current;
      }

      return findDefaultMilestoneId(orderedMilestones, currentTaskId);
    });
    // The server response owns the canonical milestone/task order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones, currentTaskId]);

  if (isLoading) {
    return <ProjectMilestonesTasksSkeleton className={className} />;
  }

  const selectedMilestone =
    orderedMilestones.find((milestone) => String(milestone.id) === selectedMilestoneId) ??
    orderedMilestones[0];
  const selectedIndex = selectedMilestone
    ? orderedMilestones.findIndex((milestone) => milestone.id === selectedMilestone.id)
    : -1;
  const selectedTasks = selectedMilestone
    ? (tasksByMilestone[String(selectedMilestone.id)] ?? [])
    : [];
  const selectedDone = selectedTasks.filter((task) => task.status === 'completed').length;
  const selectedDuration = formatTimeMinutes(totalEstimatedMinutes(selectedTasks));
  const totalTasks = orderedMilestones.reduce(
    (total, milestone) => total + milestone.tasks.length,
    0,
  );
  const keyTopic = selectedIndex >= 0 ? keyTopics[selectedIndex] : undefined;
  const selectedStageStyle = STAGE_STYLES[selectedIndex % STAGE_STYLES.length] ?? STAGE_STYLES[0];
  const gates = selectedMilestone
    ? Array.from(
        new Set(selectedMilestone.tasks.flatMap((task) => task.dods.map((item) => item.value))),
      )
    : [];

  const handleActivateMilestone = (milestone: PlanMilestone) => {
    setSelectedMilestoneId(String(milestone.id));
    setShowAllTasks(false);
  };

  return (
    <section id="milestones" className={cn('space-y-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Interactive Milestone Pipeline & Architecture Roadmap
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select a milestone to inspect its tasks and paired architectural pillar, or view all{' '}
            {totalTasks} tasks at once.
          </p>
        </div>
        <Button
          type="button"
          variant={showAllTasks ? 'default' : 'outline'}
          onClick={() => setShowAllTasks((current) => !current)}
        >
          {showAllTasks ? `Viewing All ${totalTasks} Tasks` : `View All Milestones (${totalTasks})`}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {orderedMilestones.map((milestone, index) => {
          const tasks = tasksByMilestone[String(milestone.id)] ?? [];
          const stageStyle = STAGE_STYLES[index % STAGE_STYLES.length] ?? STAGE_STYLES[0];
          const done = tasks.filter((task) => task.status === 'completed').length;
          const total = tasks.length;
          const duration = formatTimeMinutes(totalEstimatedMinutes(tasks));
          const active = milestone.id === selectedMilestone?.id;
          const hasFocus = tasks.some(
            (task) => task.id === currentTaskId && task.status !== 'completed',
          );
          const complete = total > 0 && done === total;

          return (
            <button
              key={milestone.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleActivateMilestone(milestone)}
              className={cn(
                'flex min-h-32 cursor-pointer flex-col justify-between rounded-card border p-4 text-left transition-all',
                active
                  ? '-translate-y-0.5 border-action bg-action text-action-foreground shadow-md'
                  : 'border-border bg-surface text-foreground hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'rounded-pill px-2.5 py-0.5 text-[11px] font-bold',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : `${stageStyle.background} ${stageStyle.foreground}`,
                  )}
                >
                  M{index + 1}
                </span>
                {complete ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : hasFocus ? (
                  <span
                    className={cn(
                      'rounded-pill px-2 py-0.5 text-[10px] font-bold',
                      active
                        ? 'bg-action-foreground/15 text-accent'
                        : 'bg-primary-soft text-primary-foreground',
                    )}
                  >
                    Focus
                  </span>
                ) : (
                  <span
                    className={cn(
                      'text-[11px] font-semibold tabular-nums',
                      active ? 'text-action-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {done}/{total}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <p className="line-clamp-2 text-xs font-bold leading-snug">{milestone.title}</p>
                <p
                  className={cn(
                    'mt-1 text-[11px] font-medium',
                    active ? 'text-action-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {done}/{total} tasks{duration ? ` · ${duration}` : ''}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        {showAllTasks ? (
          <Card className="p-6 xl:col-span-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-foreground">All Milestones & Tasks</h3>
              <button
                type="button"
                className="text-xs font-bold text-foreground underline-offset-4 hover:underline"
                onClick={() => setShowAllTasks(false)}
              >
                Back to Focused Stage View
              </button>
            </div>

            <div className="max-h-[640px] space-y-5 overflow-y-auto pr-1">
              {orderedMilestones.map((milestone, index) => {
                const tasks = tasksByMilestone[String(milestone.id)] ?? [];
                const duration = formatTimeMinutes(totalEstimatedMinutes(tasks));

                return (
                  <div key={milestone.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-secondary px-3 py-2">
                      <p className="text-xs font-bold text-foreground">
                        M{index + 1}: {milestone.title}
                      </p>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {duration ?? 'No estimate'}
                      </span>
                    </div>

                    <div className="space-y-1.5 pl-1">
                      {tasks.map((task) => {
                        const done = task.status === 'completed';

                        return (
                          <button
                            key={task.id}
                            type="button"
                            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2 text-left transition-colors hover:bg-surface-secondary"
                            onClick={() => onContinueTask?.(milestone, task)}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={cn(
                                  'flex size-4 shrink-0 items-center justify-center rounded-full border',
                                  done
                                    ? 'border-action bg-action text-accent'
                                    : 'border-border bg-surface',
                                )}
                              >
                                {done && <Check className="size-2.5" />}
                              </span>
                              <span
                                className={cn(
                                  'truncate text-xs font-medium',
                                  done ? 'text-muted-foreground line-through' : 'text-foreground',
                                )}
                              >
                                {task.title}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                              {formatTimeMinutes(task.estimatedTimeMinutes) ?? '—'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col gap-5 p-6 xl:col-span-7">
            {selectedMilestone ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-pill px-2.5 py-0.5 text-[11px] font-bold',
                          selectedStageStyle.background,
                          selectedStageStyle.foreground,
                        )}
                      >
                        Milestone {selectedIndex + 1} of {orderedMilestones.length}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Est. {selectedDuration ?? 'No estimate'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground sm:text-lg">
                      {selectedMilestone.title}
                    </h3>
                  </div>
                  <span className="rounded-pill border border-border bg-surface-secondary px-3 py-1 text-xs font-bold tabular-nums text-foreground">
                    {selectedDone} / {selectedTasks.length} Done
                  </span>
                </div>

                {selectedTasks.length > 0 ? (
                  <DragDropProvider
                    onDragStart={(event) => {
                      const { source } = event.operation;

                      if (!isSortable(source) || source.type !== 'task') return;

                      const task = Object.values(tasksByMilestone)
                        .flat()
                        .find((item) => item.id === source.id);

                      setActiveTask(task ?? null);
                      dragOriginRef.current = String(selectedMilestone.id);
                    }}
                    onDragOver={(event) => {
                      const { source } = event.operation;

                      if (!isSortable(source) || source.type !== 'task') return;

                      setTasksByMilestone((records) => move(records, event));
                    }}
                    onDragEnd={(event) => {
                      setActiveTask(null);

                      if (event.canceled) return;

                      const { source } = event.operation;

                      if (!isSortable(source) || source.type !== 'task') return;

                      const fromMilestoneId = dragOriginRef.current;
                      dragOriginRef.current = null;

                      if (!fromMilestoneId) return;

                      const toMilestoneId = Object.entries(tasksByMilestone).find(([, tasks]) =>
                        tasks.some((task) => task.id === source.id),
                      )?.[0];

                      if (!toMilestoneId) return;

                      onOrderChange?.(
                        orderedMilestones.map((milestone) => ({
                          ...milestone,
                          tasks: tasksByMilestone[String(milestone.id)] ?? [],
                        })),
                      );
                    }}
                  >
                    <div className="space-y-3">
                      {selectedTasks.map((task, index) => (
                        <SortableTaskRow
                          key={task.id}
                          task={task}
                          index={index}
                          currentMilestoneId={String(selectedMilestone.id)}
                          milestone={selectedMilestone}
                          isCurrent={task.id === currentTaskId}
                          onContinueTask={onContinueTask}
                          onActivateTask={onActivateTask}
                          onReopenTask={onReopenTask}
                        />
                      ))}
                    </div>
                    <DragOverlay>{activeTask && <TaskDragPreview task={activeTask} />}</DragOverlay>
                  </DragDropProvider>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-secondary p-8 text-center text-sm text-muted-foreground">
                    No tasks in this milestone yet.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No milestones have been generated yet.
              </div>
            )}
          </Card>
        )}

        <Card className="flex flex-col gap-5 p-6 xl:col-span-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Key Topic & Architectural Pillar
            </h3>
            {keyTopics.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="px-2.5 text-[11px]"
                onClick={() => setShowAllTopics((current) => !current)}
              >
                {showAllTopics ? 'Paired Pillar' : `All ${keyTopics.length} Topics`}
              </Button>
            )}
          </div>

          {showAllTopics ? (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {keyTopics.map((topic, index) => (
                <button
                  key={`${topic.topic}-${index}`}
                  type="button"
                  onClick={() => {
                    const milestone = orderedMilestones[index];
                    if (milestone) {
                      handleActivateMilestone(milestone);
                    }
                    setShowAllTopics(false);
                  }}
                  className="w-full cursor-pointer rounded-2xl border border-border bg-surface-secondary p-3.5 text-left transition-colors hover:bg-surface"
                >
                  <p className="text-xs font-bold text-foreground">
                    {orderedMilestones[index] ? `M${index + 1}: ` : ''}
                    {topic.topic}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {topic.description}
                  </p>
                </button>
              ))}
            </div>
          ) : keyTopic ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-surface-secondary p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                      selectedStageStyle.background,
                      selectedStageStyle.foreground,
                    )}
                  >
                    <Target className="size-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      M{(selectedIndex + 1).toString()} Core Discipline
                    </p>
                    <h4 className="text-base font-bold text-foreground">{keyTopic.topic}</h4>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {keyTopic.description}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Verification & Exit Gates
                </p>
                {gates.length > 0 ? (
                  <div className="max-h-64 flex flex-wrap gap-2 space-y-2 overflow-y-auto pr-1">
                    {gates.map((gate) => (
                      <div
                        key={gate}
                        className="flex items-start w-fit gap-2.5 rounded-2xl border border-border/60 bg-surface-secondary px-3.5 py-2.5 text-xs font-semibold text-foreground"
                      >
                        <Check className="mt-0.5 size-3.5 shrink-0 text-primary-foreground" />
                        <span>{gate}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Definition-of-done gates appear after tasks are generated.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-secondary p-6 text-center">
              <Sparkles className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                Key topics are generated alongside the project plan.
              </p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl border border-accent-secondary/50 bg-accent-secondary-soft p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary-foreground">
                Project Deliverable
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-foreground">
                {primaryDeliverable?.name ??
                  (deliverables.length > 0
                    ? `${deliverables.length} linked deliverables`
                    : 'No deliverable linked yet')}
              </p>
            </div>
            <Link
              href={`/projects/${projectId}/artifacts`}
              className={buttonVariants({ size: 'sm', variant: 'default' })}
            >
              Inspect
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ProjectMilestonesTasks;
