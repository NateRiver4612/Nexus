import type { ProjectDetailType } from '@nexus/types';
import { Award } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import Status from '../Status';
import Overview from '../Overview';
import { EditableProjectTitle } from './EditableProjectTitle';

type ProjectGeneralProps = {
  data?: ProjectDetailType;
  isLoading?: boolean;
  className?: string;
};

const HIGHLIGHT_STYLES = [
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

function formatDate(date: string | null | undefined) {
  if (!date) return 'Not opened yet';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

const ProjectGeneralSkeleton = ({ className }: { className?: string }) => {
  return (
    <Card className={cn('flex h-full flex-col gap-6 p-6 sm:p-7', className)}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-pill" />
          <Skeleton className="h-6 w-32 rounded-pill" />
          <Skeleton className="ml-auto h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      <div className="border-t border-border/70 pt-5">
        <Skeleton className="mb-3 h-4 w-64" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </Card>
  );
};

export const ProjectGeneral = ({ data, isLoading, className }: ProjectGeneralProps) => {
  if (isLoading || !data) {
    return <ProjectGeneralSkeleton className={className} />;
  }

  const highlights = data.summary?.highlights ?? [];

  return (
    <Card className={cn('flex h-full flex-col justify-between gap-6 p-6 sm:p-7', className)}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Status status={data.status} size="sm" />
            <span className="rounded-pill border border-border bg-surface-secondary px-3 py-1 text-[11px] font-semibold text-foreground">
              Category: <span className="capitalize">{data.category}</span>
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Last opened: {formatDate(data.lastOpenedAt)}
          </span>
        </div>

        <div className="min-w-0">
          <EditableProjectTitle projectId={data.id} name={data.name} />
        </div>

        <Overview
          data={data.summary?.overview ?? data.description ?? 'No overview yet.'}
          showTitle={false}
        />
      </div>

      {highlights.length > 0 && (
        <div className="border-t border-border/70 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Award aria-hidden="true" className="size-4 text-accent-tertiary" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Senior engineering highlights ({highlights.length} core standards)
            </h2>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {highlights.map((highlight, index) => {
              const highlightStyle =
                HIGHLIGHT_STYLES[index % HIGHLIGHT_STYLES.length] ?? HIGHLIGHT_STYLES[0];

              return (
                <div
                  key={`${highlight}-${index}`}
                  className={cn(
                    'flex items-start gap-2.5 rounded-2xl border border-border/60 bg-surface-secondary p-3',
                    highlights.length % 2 === 1 &&
                      index === highlights.length - 1 &&
                      'sm:col-span-2',
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold',
                      highlightStyle.background,
                      highlightStyle.foreground,
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs font-medium leading-relaxed text-foreground">{highlight}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProjectGeneral;
