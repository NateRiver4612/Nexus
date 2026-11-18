'use client';

import type { ProjectCategoryType, ProjectDetailType, ProjectStatusType } from '@nexus/types';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ProjectCardProps = {
  project?: ProjectDetailType;
  isLoading?: boolean;
};

const CARD_WIDTH_CLASS = 'w-full max-w-[34rem] shrink-0';

const CATEGORY_STYLES: Record<ProjectCategoryType, string> = {
  engineering: 'bg-primary-soft text-primary-foreground',
  research: 'bg-accent-secondary-soft text-accent-secondary-foreground',
  marketing: 'bg-accent-tertiary-soft text-accent-tertiary-foreground',
  finance: 'bg-accent-soft text-accent-foreground',
  personal: 'bg-surface-secondary text-muted-foreground',
};

const STATUS_STYLES: Record<
  ProjectStatusType,
  { label: string; className: string; dotClassName: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-action text-action-foreground',
    dotClassName: 'bg-accent',
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  paused: {
    label: 'Paused',
    className: 'bg-accent-soft text-accent-foreground',
    dotClassName: 'bg-accent-tertiary',
  },
  completed: {
    label: 'Completed',
    className: 'bg-primary-soft text-primary-foreground',
    dotClassName: 'bg-primary',
  },
  archived: {
    label: 'Archived',
    className: 'bg-accent-secondary-soft text-accent-secondary-foreground',
    dotClassName: 'bg-accent-secondary',
  },
};

const ProjectStatusPill = ({ status }: { status: ProjectStatusType }) => {
  const { label, className, dotClassName } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-pill px-3 py-1 text-[11px] font-bold leading-none',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', dotClassName)} />
      {label}
    </span>
  );
};

const ProjectCardSkeleton = () => {
  return (
    <Card className={cn('flex flex-col gap-4 p-5 sm:p-6', CARD_WIDTH_CLASS)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-pill" />
          <Skeleton className="h-6 w-24 rounded-pill" />
        </div>
        <Skeleton className="h-6 w-20 rounded-pill" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-pill" />
        <Skeleton className="h-6 w-24 rounded-pill" />
        <Skeleton className="h-6 w-16 rounded-pill" />
      </div>

      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-1 w-full rounded-full" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-36 rounded-pill" />
        <Skeleton className="h-8 w-28 rounded-pill" />
      </div>
    </Card>
  );
};

export const ProjectCard = ({ project, isLoading }: ProjectCardProps) => {
  const router = useRouter();

  if (isLoading || !project) {
    return <ProjectCardSkeleton />;
  }

  const code = `PRJ-${project.id.slice(0, 4).toUpperCase()}`;
  const milestone = project.currentMilestone;
  const totalTasks = milestone?.numOfTasks ?? project.numOfTasks ?? 0;
  const completedTasks = milestone?.numOfCompletedTasks ?? project.numOfCompletedTasks ?? 0;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const milestoneLabel = milestone
    ? `Milestone ${milestone.position + 1} · ${milestone.title}`
    : 'Project progress';
  const keywords = project.summary?.keywords?.slice(0, 5) ?? [];
  const description = project.description?.trim() || project.summary?.overview;

  const handleCardClick = () => {
    router.push(`/projects/${project.id}`);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        'flex cursor-pointer flex-col gap-4 p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6',
        CARD_WIDTH_CLASS,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-pill border border-border bg-surface px-3 py-1 text-[11px] font-bold tracking-wide text-foreground">
            {code}
          </span>
          <span
            className={cn(
              'rounded-pill px-3 py-1 text-[11px] font-semibold capitalize leading-none',
              CATEGORY_STYLES[project.category],
            )}
          >
            {project.category}
          </span>
        </div>
        <ProjectStatusPill status={project.status} />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold leading-snug tracking-tight text-foreground">
          {project.name}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {description ?? 'No description yet.'}
        </p>
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-pill border border-border bg-surface-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span
            className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground"
            title={milestone?.title ?? milestoneLabel}
          >
            {milestoneLabel}
          </span>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-foreground">
            {completedTasks}/{totalTasks} ({percent}%)
          </span>
        </div>
        <Progress value={percent} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          disabled={!project.currentTask}
          onClick={(event) => {
            event.stopPropagation();
            if (project.currentTask) router.push(`/tasks/${project.currentTask.id}`);
          }}
        >
          Inspect Active Task
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/projects/${project.id}/artifacts`);
          }}
        >
          View {project.numOfArtifacts} Artifacts
        </Button>
      </div>
    </Card>
  );
};
