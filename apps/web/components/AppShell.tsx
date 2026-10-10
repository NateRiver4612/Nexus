'use client';

import { useState } from 'react';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <div className="flex  min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <main className="min-h-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
