'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  // Wizard pages own an internal scroll region, so they need a viewport-height
  // shell. Every other route keeps document scrolling.
  const isFullHeight = pathname?.startsWith('/new-project') ?? false;

  return (
    <div
      className={cn(
        'flex w-full flex-col bg-background text-foreground',
        isFullHeight ? 'h-dvh overflow-hidden' : 'min-h-screen',
      )}
    >
      <Topbar />
      <main
        className={cn(
          'min-h-0 w-full flex-1 px-4 pb-4 pt-5 sm:px-6 sm:pb-6 md:px-8 md:pb-8',
          isFullHeight && 'flex flex-col overflow-hidden',
        )}
      >
        {children}
      </main>
    </div>
  );
};
