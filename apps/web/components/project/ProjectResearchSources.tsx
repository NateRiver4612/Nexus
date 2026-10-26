import type { ResearchSourceType } from '@nexus/types';
import { Globe } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type ProjectResearchSourcesProps = {
  sources?: ResearchSourceType[];
  className?: string;
  /** 1-based research version; rendered as the header label when present. */
  version?: number;
  /** Render just the list (no card/header) — for use inside an accordion. */
  bare?: boolean;
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const SourceFavicon = ({ favicon }: { favicon: string }) => {
  const [failed, setFailed] = useState(false);

  if (!favicon || failed) {
    return <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  }

  return (
    <img
      src={favicon}
      alt=""
      loading="lazy"
      width={16}
      height={16}
      onError={() => setFailed(true)}
      className="size-4 shrink-0 rounded-sm object-contain"
    />
  );
};

export const ProjectResearchSources = ({
  sources = [],
  className,
  version,
  bare = false,
}: ProjectResearchSourcesProps) => {
  if (sources.length === 0) {
    return null;
  }

  if (bare) {
    return (
      <div className={cn('flex flex-col gap-2.5', className)}>
        {sources.map((source, index) => {
          const domain = getDomain(source.url);

          return (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-center rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <SourceFavicon favicon={source.favicon} />
                <span className="line-clamp-1 text-[15px] font-semibold leading-snug text-primary group-hover:underline">
                  {source.title}
                </span>
              </div>

              <span className="mt-1 truncate pl-7 text-xs text-muted-foreground">{domain}</span>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('w-full rounded-xl border border-border bg-card p-5', className)}>
      <div className="mb-4 flex items-center gap-1.5 px-1 text-base font-medium text-muted-foreground">
        <span>{version !== undefined ? `Version ${version}` : 'Sources'}</span>
        <span>({sources.length})</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {sources.map((source, index) => {
          const domain = getDomain(source.url);

          return (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-center rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <SourceFavicon favicon={source.favicon} />
                <span className="line-clamp-1 text-[15px] font-semibold leading-snug text-primary group-hover:underline">
                  {source.title}
                </span>
              </div>

              <span className="mt-1 truncate pl-7 text-xs text-muted-foreground">{domain}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};
