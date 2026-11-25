import type { ReactNode } from 'react';

import { Topbar } from './Topbar';

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <Topbar />
      {/* Main owns the default scroll region so every route fills exactly the viewport
          height; pages that need internal panes can opt out with their own overflow. */}
      <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-6 pb-4 pt-5 sm:pb-6 md:pb-8">
        {children}
      </main>
    </div>
  );
};
