'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetKnowledgeSources } from '@/hooks/useKnowledge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  processing: 'bg-sky-100 text-sky-800 border-sky-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const typeLabels: Record<string, string> = {
  file: 'File',
  url: 'Web',
  youtube: 'YouTube',
  copied_text: 'Text',
  audio: 'Audio',
  video: 'Video',
};

export function SourceList({ projectId }: { projectId: string }) {
  const { data: sources, isLoading } = useGetKnowledgeSources(projectId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!sources?.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No sources yet. Add files, links, or copied text to build your knowledge base.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {sources.map((source) => (
        <li key={source.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{source.name || source.sourceRef}</p>
            <p className="text-xs text-muted-foreground">
              {typeLabels[source.sourceType] ?? source.sourceType}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={cn('border font-normal', statusStyles[source.status])}
            >
              {source.status}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
