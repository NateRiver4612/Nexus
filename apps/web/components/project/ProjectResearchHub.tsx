'use client';

import type { ProjectResearchListType } from '@nexus/types';
import { ArrowUpRight, Globe, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { SourceFavicon } from '@/components/SourceFavicon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { GenerateResearchDialog } from './GenerateResearchDialog';

type ProjectResearchHubProps = {
  history: ProjectResearchListType;
  isLoading?: boolean;
  isGenerating?: boolean;
  activeStage?: string | null;
  researchFailed?: boolean;
  isStarting?: boolean;
  onStartResearch: (input: { reason?: string; sourceLimit?: number }) => void;
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const ResearchHubSkeleton = () => {
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-52 rounded-pill" />
      </div>
      <Skeleton className="h-9 w-full max-w-md rounded-pill" />
      <div className="grid gap-3.5 md:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
    </Card>
  );
};

export const ProjectResearchHub = ({
  history,
  isLoading,
  isGenerating,
  activeStage,
  researchFailed,
  isStarting,
  onStartResearch,
}: ProjectResearchHubProps) => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [generateOpen, setGenerateOpen] = useState(false);

  const versions = useMemo(
    () => history.map((research, index) => ({ research, version: index + 1 })).reverse(),
    [history],
  );
  const activeVersion = versions.find((item) => item.version === selectedVersion) ?? versions[0];
  const sources = activeVersion?.research.sources ?? [];
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

  if (isLoading && versions.length === 0) {
    return <ResearchHubSkeleton />;
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Research & Intelligence Hub
          </h2>
          {activeVersion && (
            <>
              {versions.length > 1 ? (
                <label className="inline-flex items-center gap-1 rounded-pill bg-accent-secondary-soft text-xs font-bold text-accent-secondary-foreground">
                  <span className="sr-only">Research version</span>
                  <select
                    value={activeVersion.version}
                    onChange={(event) => {
                      setSelectedVersion(Number(event.target.value));
                      setDomainFilter('all');
                      setQuery('');
                    }}
                    className="cursor-pointer rounded-pill bg-transparent px-2.5 py-1 text-xs font-bold outline-none"
                  >
                    {versions.map((item) => (
                      <option key={item.research.id} value={item.version}>
                        Version {item.version}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="rounded-pill bg-accent-secondary-soft px-2.5 py-1 text-xs font-bold text-accent-secondary-foreground">
                  Version {activeVersion.version}
                </span>
              )}
              <span className="rounded-pill bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {sources.length} sources
              </span>
            </>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <div className="relative min-w-48 flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by domain or topic..."
              aria-label="Filter research sources"
              className="h-9 rounded-pill pl-8 text-xs"
            />
          </div>
          <Button
            type="button"
            onClick={() => setGenerateOpen(true)}
            disabled={isGenerating || isStarting}
          >
            <RefreshCw className={cn('size-3.5 text-accent', isGenerating && 'animate-spin')} />
            {isGenerating ? 'Synthesizing...' : 'Synthesize New Sources'}
          </Button>
        </div>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-secondary p-4 text-xs font-medium text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          {activeStage === 'retrying' ? 'Retrying research…' : 'Researching sources…'}
        </div>
      )}

      {!isGenerating && researchFailed && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          Research isn’t working right now — please try again later.
        </div>
      )}

      {!isGenerating && !researchFailed && sources.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface-secondary p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No research yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Synthesize sources to start building this project’s intelligence hub.
          </p>
        </div>
      )}

      {sources.length > 0 && (
        <>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setDomainFilter('all')}
              className={cn(
                'shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-semibold transition-colors',
                domainFilter === 'all'
                  ? 'bg-action text-action-foreground'
                  : 'border border-border bg-surface-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              All ({sources.length})
            </button>
            {domains.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => setDomainFilter(domain)}
                className={cn(
                  'shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  domainFilter === domain
                    ? 'bg-action text-action-foreground'
                    : 'border border-border bg-surface-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {domain}
              </button>
            ))}
          </div>

          {filteredSources.length > 0 ? (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredSources.map((source, index) => {
                const domain = getDomain(source.url);

                return (
                  <Link
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface-secondary p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-surface hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface transition-colors group-hover:bg-action group-hover:text-action-foreground">
                        <SourceFavicon favicon={source.favicon} />
                      </span>
                      <div className="min-w-0 space-y-1.5">
                        <p className="line-clamp-2 text-xs font-bold leading-snug text-foreground transition-colors group-hover:text-primary-foreground sm:text-[13px]">
                          {source.title}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <Globe className="size-3" />
                          {domain}
                        </span>
                      </div>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-muted-foreground transition-colors group-hover:bg-action group-hover:text-action-foreground">
                      <ArrowUpRight className="size-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-secondary p-8 text-center text-xs font-semibold text-muted-foreground">
              No research sources match the current filter.
            </div>
          )}
        </>
      )}

      <GenerateResearchDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onConfirm={(input) => {
          setGenerateOpen(false);
          onStartResearch(input);
        }}
        isPending={Boolean(isStarting)}
      />
    </Card>
  );
};

export default ProjectResearchHub;
