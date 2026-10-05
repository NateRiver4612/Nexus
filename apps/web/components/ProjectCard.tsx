'use client';

import { Boxes } from 'lucide-react';

import type { ProjectDetailType } from '@nexus/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProjectCardProps {
  project: ProjectDetailType;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const tasks = project.numOfTasks ?? 0;
  const completed = project.numOfCompletedTasks ?? 0;
  const percent = tasks > 0 ? Math.round((completed / tasks) * 100) : 0;

  return (
    <Card className="flex flex-col gap-4 p-5 cursor-pointer bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
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
