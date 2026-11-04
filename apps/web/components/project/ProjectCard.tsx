'use client';

import { Boxes } from 'lucide-react';

import type { ProjectDetailType } from '@nexus/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

type ProjectCardProps = {
  project?: ProjectDetailType;
  isLoading?: boolean;
};

const ProjectCardSkeleton = () => {
  return (
    <Card className="flex w-87 shrink-0 flex-col gap-4 p-5 bg-gray-100 shadow-sm">
      <div>
        <Skeleton className="size-9 rounded-md" />
      </div>
      <div>
        <Skeleton className="h-6 w-2/3" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-1 flex-1 rounded-full" />
        <Skeleton className="h-4 w-8" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <Skeleton className="mt-auto h-4 w-full" />
    </Card>
  );
};

export function ProjectCard({ project, isLoading }: ProjectCardProps) {
  if (isLoading || !project) {
    return <ProjectCardSkeleton />;
  }

  const tasks = project.numOfTasks ?? 0;
  const completed = project.numOfCompletedTasks ?? 0;
  const percent = tasks > 0 ? Math.round((completed / tasks) * 100) : 0;

  const router = useRouter();

  const handleOnClick = () => {
    router.push(`/projects/${project.id}`);
  };

  return (
    <Card
      onClick={handleOnClick}
      className="flex w-87 shrink-0 flex-col gap-4 p-5 cursor-pointer bg-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div>
        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Boxes className="size-5" />
        </div>
      </div>

      <div>
        <h3 className="font-semibold">{project.name}</h3>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={percent} />
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Continue
        </p>
        <p className="text-sm text-foreground">
          {project.currentTask?.title ?? project.description ?? 'No active tasks yet'}
        </p>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">
        {project.numOfKnowledgeSources ?? 0} files <span className="mx-1">·</span>{' '}
        {project.numOfArtifacts ?? 0} artifacts <span className="mx-1">·</span>{' '}
        {project.numOfDeliverables ?? 0} deliverables
      </p>
    </Card>
  );
}
