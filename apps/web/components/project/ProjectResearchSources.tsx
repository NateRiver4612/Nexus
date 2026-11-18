'use client';

import type { ResearchSourceType } from '@nexus/types';
import { Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { SourceFavicon } from '@/components/SourceFavicon';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ProjectResearchSourcesProps = {
  sources?: ResearchSourceType[];
  className?: string;
  isLoading?: boolean;
  /** Removal persists server-side, so the trash action only renders when provided. */
  onRemoveSource?: (source: ResearchSourceType) => void;
  /** URL currently being removed — disables its trash button. */
  removingUrl?: string | null;
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const SourceSkeletonRow = () => {
  return (
    <div className="flex items-center gap-3 rounded-item border border-border bg-surface px-4 py-3">
      <Skeleton className="size-4 shrink-0 rounded-sm" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
};

const ProjectResearchSourcesSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <Skeleton className="h-9 w-full rounded-pill" />
      <SourceSkeletonRow />
      <SourceSkeletonRow />
      <SourceSkeletonRow />
    </div>
  );
};

export const ProjectResearchSources = ({
  sources = [],
  className,
  isLoading = false,
  onRemoveSource,
  removingUrl,
}: ProjectResearchSourcesProps) => {
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');

  if (isLoading) {
    return <ProjectResearchSourcesSkeleton className={className} />;
  }

  const domains = Array.from(new Set(sources.map((source) => getDomain(source.url))));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSources = sources.filter((source) => {
    const domain = getDomain(source.url);
    const matchesDomain = domainFilter === 'all' || domain === domainFilter;
    const matchesQuery =
      !normalizedQuery ||
      source.title.toLowerCase().includes(normalizedQuery) ||
      domain.toLowerCase().includes(normalizedQuery) ||
      source.url.toLowerCase().includes(normalizedQuery);

    return matchesDomain && matchesQuery;
  });

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-3', className)}>
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${sources.length} grounded docs & guides...`}
          aria-label="Filter grounded sources"
          className="h-9 rounded-pill pl-8 text-xs"
        />
      </div>

      {domains.length > 0 && (
        <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setDomainFilter('all')}
            className={cn(
              'shrink-0 cursor-pointer rounded-pill px-3 py-1 text-[11px] font-bold transition-colors',
              domainFilter === 'all'
                ? 'bg-action text-action-foreground'
                : 'border border-border bg-surface-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            All
          </button>
          {domains.map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => setDomainFilter(domain)}
              className={cn(
                'shrink-0 cursor-pointer rounded-pill px-3 py-1 text-[11px] font-bold transition-colors',
                domainFilter === domain
                  ? 'bg-action text-action-foreground'
                  : 'border border-border bg-surface-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {domain}
            </button>
          ))}
        </div>
      )}

      {filteredSources.length > 0 ? (
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          {filteredSources.map((source, index) => {
            const domain = getDomain(source.url);
            const isRemoving = removingUrl === source.url;

            return (
              <div
                key={`${source.url}-${index}`}
                className={cn(
                  'flex items-center gap-3 rounded-item border border-border bg-surface px-4 py-3 transition-opacity',
                  isRemoving && 'opacity-50',
                )}
              >
                <SourceFavicon favicon={source.favicon} />

                <div className="min-w-0 flex-1">
                  <Link
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[13px] font-bold leading-snug text-foreground hover:underline"
                  >
                    {source.title}
                  </Link>
                  <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
                    {domain}
                  </span>
                </div>

                {onRemoveSource && (
                  <button
                    type="button"
                    onClick={() => onRemoveSource(source)}
                    disabled={isRemoving}
                    aria-label={`Remove ${source.title}`}
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-item border border-dashed border-border bg-surface-secondary p-6 text-center text-xs font-semibold text-muted-foreground">
          {sources.length === 0
            ? 'No grounded sources yet.'
            : 'No sources match the current filter.'}
        </p>
      )}

      <p className="mt-auto shrink-0 text-center text-[11px] text-muted-foreground">
        Want more sources? You can generate or attach more inside the workspace.
      </p>
    </div>
  );
};
