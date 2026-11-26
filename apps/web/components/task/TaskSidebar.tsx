'use client';

import type { TaskDetailType, TaskNoteType, TaskType } from '@nexus/types';
import { PanelLeftClose, PanelLeftOpen, Plus, Target } from 'lucide-react';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { useGetMilestones } from '@/hooks/useMilestones';
import { cn, formatTimeMinutes } from '@/lib/utils';

import Status from '../Status';
import TaskNotesPanel from './TaskNotesPanel';

type SiblingTask = Pick<TaskType, 'id' | 'title' | 'status' | 'estimatedTimeMinutes'>;

type TaskSidebarProps = {
  task: TaskDetailType;
  notes?: TaskNoteType[];
  isNotesLoading?: boolean;
  /** The note currently open in the center workbench. */
  selectedNoteId?: string | null;
  onSelectNote: (note: TaskNoteType) => void;
  onAddNote: () => void;
  onDeleteNote: (note: TaskNoteType) => void;
  /** Narrow rail vs. full mission/momentum sidebar. */
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  /** Elapsed focus minutes, mirrored into Execution Momentum. */
  loggedMinutes: number;
  className?: string;
};

const ProgressRing = ({ percent }: { percent: number }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.min(100, Math.max(0, percent));
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 56 56"
        className="size-14 -rotate-90"
        role="img"
        aria-label={`${safePercent}% checks complete`}
      >
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="transparent"
          strokeWidth="6"
          className="stroke-muted"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="transparent"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-action transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-foreground">
        {safePercent}%
      </span>
    </div>
  );
};

const SiblingTaskPill = ({
  task,
  index,
  isCurrent,
}: {
  task: SiblingTask;
  index: number;
  isCurrent: boolean;
}) => {
  return (
    <Link
      href={`/tasks/${task.id}`}
      aria-current={isCurrent ? 'page' : undefined}
      title={task.title}
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1.5 text-[11px] font-bold transition-colors',
        isCurrent
          ? 'bg-action text-accent'
          : 'bg-surface-secondary text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      Task {index + 1}
    </Link>
  );
};

const SiblingTaskDot = ({
  task,
  index,
  isCurrent,
}: {
  task: SiblingTask;
  index: number;
  isCurrent: boolean;
}) => {
  return (
    <Link
      href={`/tasks/${task.id}`}
      aria-current={isCurrent ? 'page' : undefined}
      aria-label={`Task ${index + 1}: ${task.title}`}
      title={task.title}
      className={cn(
        'flex size-10 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
        isCurrent
          ? 'bg-action text-accent'
          : 'bg-surface-secondary text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      T{index + 1}
    </Link>
  );
};

type ActiveMissionCardProps = {
  task: TaskDetailType;
  milestoneLabel: string;
  duration: string | null;
  onToggleCollapsed: () => void;
};

const ActiveMissionCard = ({
  task,
  milestoneLabel,
  duration,
  onToggleCollapsed,
}: ActiveMissionCardProps) => {
  return (
    <Card className="relative overflow-hidden rounded-card bg-accent p-5 text-accent-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-pill bg-action text-accent">
            <Target className="size-4" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest">Active Mission</span>
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse task sidebar"
          title="Collapse task sidebar"
          className="flex size-9 items-center justify-center rounded-pill text-foreground transition-colors hover:bg-foreground/10"
        >
          <PanelLeftClose className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-pill bg-action px-2.5 py-1 text-[11px] font-bold text-accent">
          {milestoneLabel}
        </span>
        <span className="rounded-pill bg-surface/80 px-2.5 py-1 text-[11px] font-bold capitalize text-foreground">
          {task.difficulty}
          {duration ? ` · ${duration}` : ''}
        </span>
      </div>

      <h2 className="mt-3 text-lg font-bold leading-snug text-foreground">{task.title}</h2>
      {task.description && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">{task.description}</p>
      )}
    </Card>
  );
};

type MomentumCardProps = {
  task: TaskDetailType;
  siblingTasks: SiblingTask[];
  loggedMinutes: number;
  duration: string | null;
  checksCompleted: number;
  checksTotal: number;
  checksPercent: number;
};

const MomentumCard = ({
  task,
  siblingTasks,
  loggedMinutes,
  duration,
  checksCompleted,
  checksTotal,
  checksPercent,
}: MomentumCardProps) => {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Execution Momentum
        </h2>
        <Status status={task.status} size="sm" />
      </div>

      <div className="flex items-center gap-4">
        <ProgressRing percent={checksPercent} />
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-foreground">
            <span className="tabular-nums">
              {checksCompleted}/{checksTotal}
            </span>{' '}
            Checks Done
          </p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {loggedMinutes}m logged · {duration ?? 'No estimate'} target
          </p>
        </div>
      </div>

      {siblingTasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {siblingTasks.map((sibling, index) => (
            <SiblingTaskPill
              key={sibling.id}
              task={sibling}
              index={index}
              isCurrent={sibling.id === task.id}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

type CollapsedRailProps = {
  siblingTasks: SiblingTask[];
  currentTaskId: string;
  checksCompleted: number;
  checksTotal: number;
  onExpand: () => void;
  onAddNote: () => void;
};

const CollapsedRail = ({
  siblingTasks,
  currentTaskId,
  checksCompleted,
  checksTotal,
  onExpand,
  onAddNote,
}: CollapsedRailProps) => {
  return (
    <div className="mx-auto flex h-full w-14 flex-col items-center gap-3 rounded-full border border-border bg-card px-1 py-3 shadow-2xs lg:mx-0 lg:w-full">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand task sidebar"
        title="Expand task sidebar"
        className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:brightness-95"
      >
        <PanelLeftOpen className="size-4" aria-hidden="true" />
      </button>

      <div className="h-px w-8 bg-border" />

      <div className="flex flex-col items-center gap-2">
        {siblingTasks.map((sibling, index) => (
          <SiblingTaskDot
            key={sibling.id}
            task={sibling}
            index={index}
            isCurrent={sibling.id === currentTaskId}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-secondary text-[10px] font-bold tabular-nums text-muted-foreground">
          {checksCompleted}/{checksTotal}
        </span>
        <button
          type="button"
          onClick={onAddNote}
          aria-label="Add a note"
          title="Add a note"
          className="flex size-10 items-center justify-center rounded-full bg-action text-accent transition-colors hover:bg-action-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

/**
 * Left column of the task workbench: the active-mission/momentum cards plus notes,
 * or the compact task rail when collapsed.
 */
const TaskSidebar = ({
  task,
  notes,
  isNotesLoading,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  isCollapsed,
  onToggleCollapsed,
  loggedMinutes,
  className,
}: TaskSidebarProps) => {
  const { data: milestones = [] } = useGetMilestones({
    variables: task.project.id,
  });

  const orderedMilestones = [...milestones].sort((a, b) => a.position - b.position);
  const milestoneIndex = orderedMilestones.findIndex(
    (milestone) => milestone.id === task.milestone?.id,
  );
  const milestone = milestoneIndex >= 0 ? orderedMilestones[milestoneIndex] : undefined;
  const siblingTasks: SiblingTask[] = milestone
    ? [...milestone.tasks]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          estimatedTimeMinutes: item.estimatedTimeMinutes,
        }))
    : [
        {
          id: task.id,
          title: task.title,
          status: task.status,
          estimatedTimeMinutes: task.estimatedTimeMinutes,
        },
      ];

  const milestoneLabel = milestoneIndex >= 0 ? `M${milestoneIndex + 1}` : 'Focus';
  const duration = formatTimeMinutes(task.estimatedTimeMinutes);
  const checksTotal = task.steps.length + task.dods.length;
  const checksCompleted =
    task.steps.filter((step) => step.status === 'completed').length +
    task.dods.filter((dod) => dod.status === 'completed').length;
  const checksPercent = checksTotal === 0 ? 0 : Math.round((checksCompleted / checksTotal) * 100);

  if (isCollapsed) {
    return (
      <CollapsedRail
        siblingTasks={siblingTasks}
        currentTaskId={task.id}
        checksCompleted={checksCompleted}
        checksTotal={checksTotal}
        onExpand={onToggleCollapsed}
        onAddNote={onAddNote}
      />
    );
  }

  return (
    <div className={cn('flex min-h-full flex-col gap-4', className)}>
      <ActiveMissionCard
        task={task}
        milestoneLabel={milestoneLabel}
        duration={duration}
        onToggleCollapsed={onToggleCollapsed}
      />
      <MomentumCard
        task={task}
        siblingTasks={siblingTasks}
        loggedMinutes={loggedMinutes}
        duration={duration}
        checksCompleted={checksCompleted}
        checksTotal={checksTotal}
        checksPercent={checksPercent}
      />
      <TaskNotesPanel
        notes={notes}
        isLoading={isNotesLoading}
        selectedNoteId={selectedNoteId}
        onSelectNote={onSelectNote}
        onAddNote={onAddNote}
        onDeleteNote={onDeleteNote}
      />
    </div>
  );
};

export default TaskSidebar;
