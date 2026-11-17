import type { ReactNode } from 'react';

import { Topbar } from './Topbar';

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Topbar />
      <main className="min-h-0 w-full flex-1 px-4 pb-4 pt-5 sm:px-6 sm:pb-6 md:px-8 md:pb-8">
        {children}
      </main>
    </div>
  );
};
