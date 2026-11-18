'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NewProjectLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isPreview = pathname === '/new-project/preview';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 2xl:gap-6">
      <nav aria-label="Breadcrumb" className="flex shrink-0 items-center gap-2 text-sm">
        <Link
          href="/projects"
          className="rounded-control text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
        >
          Projects
        </Link>
        <span aria-hidden="true" className="text-placeholder">
          /
        </span>
        <span
          aria-current={isPreview ? undefined : 'page'}
          className="truncate font-semibold text-foreground"
        >
          Create new project
        </span>
        {isPreview && (
          <>
            <span aria-hidden="true" className="text-placeholder">
              /
            </span>
            <span
              aria-current="page"
              className="shrink-0 rounded-pill bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground"
            >
              Review &amp; Confirm Plan
            </span>
          </>
        )}
      </nav>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
};

export default NewProjectLayout;
