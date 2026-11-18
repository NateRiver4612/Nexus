'use client';

import type { MilestoneWithTasksListType, ProjectDetailType } from '@nexus/types';
import { BookOpen, Check, Clock, FileCode, Flag, Package, Play, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatTimeMinutes, totalEstimatedMinutes } from '@/lib/utils';

type ProjectSummaryProps = {
  project?: ProjectDetailType;
  milestones?: MilestoneWithTasksListType;
  isLoading?: boolean;
  className?: string;
};

const ProjectSummarySkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex h-full flex-col gap-5', className)}>
      <Card className="rounded-card bg-accent p-6">
        <Skeleton className="h-6 w-44 rounded-pill bg-foreground/10" />
        <Skeleton className="mt-5 h-7 w-3/4 bg-foreground/10" />
        <Skeleton className="mt-3 h-4 w-40 bg-foreground/10" />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-pill bg-foreground/10" />
          <Skeleton className="h-10 w-32 rounded-pill bg-foreground/10" />
        </div>
      </Card>
      <Card className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
      </Card>
    </div>
  );
};

export const ProjectSummary = ({
  project,
  milestones = [],
  isLoading,
  className,
}: ProjectSummaryProps) => {
  const router = useRouter();

  if (isLoading || !project) {
    return <ProjectSummarySkeleton className={className} />;
  }

  const orderedMilestones = [...milestones].sort((a, b) => a.position - b.position);
  const currentTask =
    project.currentTask && project.currentTask.status !== 'completed'
      ? project.currentTask
      : undefined;

  let focusEntry:
    | { milestone: (typeof orderedMilestones)[number]; task: NonNullable<typeof currentTask> }
    | undefined;

  if (currentTask) {
    const milestone = orderedMilestones.find((item) =>
      item.tasks.some((task) => task.id === currentTask.id),
    );

    if (milestone) {
      focusEntry = { milestone, task: currentTask };
    }
  }

  if (!focusEntry) {
    for (const milestone of orderedMilestones) {
      const task = [...milestone.tasks]
        .sort((a, b) => a.position - b.position)
        .find((item) => item.status !== 'completed');

      if (task) {
        focusEntry = { milestone, task };
        break;
      }
    }
  }

  const milestoneNumber = focusEntry
    ? orderedMilestones.findIndex((item) => item.id === focusEntry.milestone.id) + 1
    : null;
  const focusDuration = formatTimeMinutes(focusEntry?.task.estimatedTimeMinutes);
  const totalMinutes = totalEstimatedMinutes(
    orderedMilestones.flatMap((milestone) => milestone.tasks),
  );
  const totalTime = formatTimeMinutes(totalMinutes);
  const progress = Math.min(100, Math.max(0, project.progressPercentage ?? 0));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  const metrics = [
    {
      label: 'Milestones',
      value: project.numOfMilestones,
      icon: Flag,
      href: '#milestones',
      className: 'bg-primary-soft text-primary-foreground',
    },
    {
      label: 'Artifacts',
      value: project.numOfArtifacts,
      icon: FileCode,
      href: `/projects/${project.id}/artifacts`,
      className: 'bg-accent-secondary-soft text-accent-secondary-foreground',
    },
    {
      label: 'Knowledge',
      value: project.numOfKnowledgeSources,
      icon: BookOpen,
      href: `/projects/${project.id}/knowledge`,
      className: 'bg-accent-tertiary-soft text-accent-tertiary-foreground',
    },
    {
      label: 'Deliverables',
      value: project.numOfDeliverables,
      icon: Package,
      className: 'border border-border bg-surface-secondary text-foreground',
    },
  ];

  return (
    <div className={cn('flex h-full flex-col gap-5', className)}>
      <section className="relative overflow-hidden rounded-card bg-accent p-6 text-accent-foreground shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-action px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-action-foreground">
            <Zap className="size-3 text-accent" />
            Next Up · Current Focus
          </span>
          {focusEntry && (
            <span className="rounded-pill bg-surface/70 px-2.5 py-1 text-[11px] font-bold">
              {milestoneNumber ? `M${milestoneNumber}` : 'Focus'} ·{' '}
              <span className="capitalize">{focusEntry.task.difficulty}</span>
            </span>
          )}
        </div>

        {focusEntry ? (
          <>
            <h2 className="text-lg font-bold leading-snug text-foreground sm:text-xl">
              {focusEntry.task.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
              {focusDuration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {focusDuration} estimated
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-accent-foreground" />
                {focusEntry.milestone.title}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                className="min-w-[170px] flex-1"
                onClick={() => router.push(`/tasks/${focusEntry.task.id}`)}
              >
                <Play className="size-3.5 fill-current text-accent" />
                Launch Focus Session
              </Button>
              <Button
                variant="outline"
                className="border-transparent bg-surface/85 hover:bg-surface"
                title="Open the task to review its definition of done"
                onClick={() => router.push(`/tasks/${focusEntry.task.id}`)}
              >
                <Check className="size-3.5" />
                Complete Task
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <h2 className="text-lg font-bold leading-snug text-foreground sm:text-xl">
              All tasks are complete
            </h2>
            <p className="text-xs font-medium">
              The current focus is clear. Pick the next milestone when you are ready.
            </p>
          </div>
        )}
      </section>

      <Card className="flex flex-col justify-between gap-5 p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex size-20 shrink-0 items-center justify-center">
            <svg
              viewBox="0 0 88 88"
              className="size-20 -rotate-90"
              role="img"
              aria-label={`${progress}% project progress`}
            >
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="transparent"
                strokeWidth="8"
                strokeLinecap="round"
                className="stroke-muted"
              />
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="transparent"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="stroke-action transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-foreground">
              {progress}%
            </span>
          </div>

          <div className="min-w-0 min-h-fit">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Project Momentum
            </p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
              {project.numOfCompletedTasks} / {project.numOfTasks}{' '}
              <span className="text-xs font-semibold text-muted-foreground">tasks done</span>
            </p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {totalTime ? `${totalTime} total curriculum scope` : 'No task estimates yet'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const body = (
              <>
                <div className="flex items-center justify-between gap-1">
                  <Icon aria-hidden="true" className="size-3.5" />
                  <span className="text-base font-bold tabular-nums">{metric.value}</span>
                </div>
                <p className="mt-1 text-[11px] font-bold">{metric.label}</p>
              </>
            );

            return metric.href ? (
              <Link
                key={metric.label}
                href={metric.href}
                className={cn(
                  'rounded-2xl p-3 text-left text-foreground transition-all hover:brightness-95',
                  metric.className,
                )}
              >
                {body}
              </Link>
            ) : (
              <div
                key={metric.label}
                className={cn('rounded-2xl p-3 text-left text-foreground', metric.className)}
              >
                {body}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default ProjectSummary;
