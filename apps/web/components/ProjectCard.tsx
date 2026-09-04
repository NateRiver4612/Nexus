import { Boxes } from 'lucide-react';

import type { ProjectType } from '@nexus/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProjectCardProps {
  project: ProjectType;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5 cursor-pointer bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Boxes className="size-5" />
        </div>
        <Badge variant="danger">At risk</Badge>
      </div>

      <div>
        <h3 className="text-base font-semibold">{project.name}</h3>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={50} />
        <span className="text-xs text-muted-foreground">50%</span>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Continue
        </p>
        <p className="text-sm text-foreground">
          {project.description ?? 'Review Executive Summary'}
        </p>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">
        14 files <span className="mx-1">·</span> 22 artifacts <span className="mx-1">·</span>{' '}
        <span className="font-medium text-error">5 days left</span>
      </p>
    </Card>
  );
}
