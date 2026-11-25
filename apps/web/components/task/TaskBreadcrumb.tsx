'use client';

import type { TaskDetailType, TaskType } from '@nexus/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useGetMilestones } from '@/hooks/useMilestones';

type SiblingTask = Pick<TaskType, 'id' | 'title'>;

type TaskBreadcrumbProps = {
  task: TaskDetailType;
};

/** Context pill: project → task position → title, with sibling prev/next controls. */
const TaskBreadcrumb = ({ task }: TaskBreadcrumbProps) => {
  const router = useRouter();
  const { data: milestones = [] } = useGetMilestones({ variables: task.project.id });

  const orderedMilestones = [...milestones].sort((a, b) => a.position - b.position);
  const milestone = orderedMilestones.find((item) => item.id === task.milestone?.id);
  const siblingTasks: SiblingTask[] = milestone
    ? [...milestone.tasks]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ id: item.id, title: item.title }))
    : [{ id: task.id, title: task.title }];

  const currentIndex = Math.max(
    0,
    siblingTasks.findIndex((item) => item.id === task.id),
  );
  const previous = siblingTasks[currentIndex - 1];
  const next = siblingTasks[currentIndex + 1];

  return (
    <nav
      aria-label="Task breadcrumb"
      className="flex w-fit max-w-full min-w-0 shrink-0 items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2 shadow-2xs"
    >
      <Link
        href={`/projects/${task.project.id}/overview`}
        className="hidden max-w-40 shrink-0 truncate text-xs font-bold text-muted-foreground transition-colors hover:text-foreground sm:block sm:max-w-56"
      >
        {task.project.name}
      </Link>
      <ChevronRight
        className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:block"
        aria-hidden="true"
      />
      <span className="shrink-0 rounded-pill bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
        Task {currentIndex + 1} of {siblingTasks.length}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground sm:text-sm">
        {task.title}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={previous ? `Previous task: ${previous.title}` : 'No previous task'}
          title={previous ? `Previous: ${previous.title}` : undefined}
          disabled={!previous}
          onClick={() => previous && router.push(`/tasks/${previous.id}`)}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={next ? `Next task: ${next.title}` : 'No next task'}
          title={next ? `Next: ${next.title}` : undefined}
          disabled={!next}
          onClick={() => next && router.push(`/tasks/${next.id}`)}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default TaskBreadcrumb;
