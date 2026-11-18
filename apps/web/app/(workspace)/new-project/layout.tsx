import Link from 'next/link';
import type { ReactNode } from 'react';

const NewProjectLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex h-full flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href="/projects"
          className="rounded-control text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
        >
          Projects
        </Link>
        <span aria-hidden="true" className="text-placeholder">
          /
        </span>
        <span aria-current="page" className="truncate font-semibold text-foreground">
          Create new project
        </span>
      </nav>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
};

export default NewProjectLayout;
