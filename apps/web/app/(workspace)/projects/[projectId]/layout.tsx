'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useGetProjectById } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

const tabs = [
  { href: 'overview', label: 'Overview' },
  { href: 'planner', label: 'Planner' },
  { href: 'artifacts', label: 'Artifacts' },
  { href: 'knowledge', label: 'Knowledge' },
  { href: 'assistant', label: 'Assistant' },
  { href: 'activity', label: 'Activity' },
  { href: 'settings', label: 'Settings' },
];

const ProjectNameSkeleton = () => {
  return <Skeleton className="h-4 w-40" />;
};

const ProjectLayout = ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) => {
  const { projectId } = use(params);

  const { data: project, isLoading } = useGetProjectById({
    variables: projectId,
  });

  const pathname = usePathname();
  const segments = pathname.split('/');
  const activeTab = tabs.find((tab) => segments.includes(tab.href))?.href ?? 'overview';

  return (
    <div className="flex min-h-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <Link
            href="/projects"
            className="rounded-control transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
          >
            Projects
          </Link>
          <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-placeholder" />
          {isLoading || !project ? (
            <ProjectNameSkeleton />
          ) : (
            <span className="truncate font-semibold text-foreground">{project.name}</span>
          )}
        </nav>

        <nav
          aria-label="Project sections"
          className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
        >
          {tabs.map((item) => {
            const active = activeTab === item.href;

            return (
              <Link
                key={item.href}
                href={`/projects/${projectId}/${item.href}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-action text-action-foreground shadow-xs'
                    : 'border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
};

export default ProjectLayout;
