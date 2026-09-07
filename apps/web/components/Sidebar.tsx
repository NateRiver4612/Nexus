'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Boxes,
  CalendarClock,
  ChevronsUpDown,
  FileText,
  FolderClosed,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

import { useMe } from '@/hooks/useMe';
import { isUser } from '@/lib/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderClosed },
  { href: '/planner', label: 'Planner', icon: CalendarClock },
  { href: '/artifacts', label: 'Artifacts', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: userData } = useMe();
  const user = isUser(userData) ? userData : null;

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r-border bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b-border px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="size-5" />
        </div>
        {!collapsed && <span className="text-base font-semibold tracking-tight">NEXUS</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active =
            pathname === '/new-project'
              ? item.href === '/projects'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <item.icon className="size-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="size-8">
            {user?.image && <AvatarImage src={user.image} alt={user?.name ?? 'User'} />}
            <AvatarFallback>{(user?.name ?? 'N')[0]}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name ?? 'Jordan Tran'}</p>
              <p className="truncate text-xs text-muted-foreground">PRO plan</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronsUpDown className="size-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="mt-2 flex w-full items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronsUpDown className="size-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
