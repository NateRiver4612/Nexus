'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Boxes,
  CalendarClock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useMe } from '@/hooks/useMe';
import { useGetNotifications } from '@/hooks/useNotifications';
import { useSignOut } from '@/hooks/useSignOut';
import { isUser } from '@/lib/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/planner', label: 'Planner', icon: CalendarClock },
  { href: '/artifacts', label: 'Artifacts', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

const WorkspaceLabelSkeleton = () => {
  return <Skeleton className="h-4 w-32" />;
};

const UserAvatarSkeleton = () => {
  return <Skeleton className="size-9 rounded-full" />;
};

export const Topbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading } = useMe();
  const { data: notifications } = useGetNotifications();
  const signOut = useSignOut();
  const [query, setQuery] = useState('');

  const user = isUser(data) ? data : null;
  const workspaceLabel = user?.name ? `${user.name}'s Workspace` : user?.email;
  const hasUnread =
    Array.isArray(notifications) && notifications.some((notification) => !notification.readAt);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-4 sm:px-6 sm:pt-6 md:px-8 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/projects"
          aria-label="Nexus workspace"
          className="flex shrink-0 items-center gap-3 rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-action text-action-foreground shadow-xs">
            <Boxes className="size-5 text-accent" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">NEXUS</span>
        </Link>

        <div className="hidden min-w-0 items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 shadow-2xs sm:inline-flex">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
          {isLoading ? (
            <WorkspaceLabelSkeleton />
          ) : workspaceLabel ? (
            <span className="truncate text-xs font-semibold text-foreground">{workspaceLabel}</span>
          ) : (
            <span className="truncate text-xs font-semibold text-muted-foreground">Workspace</span>
          )}
        </div>
      </div>

      <nav
        aria-label="Primary navigation"
        className="no-scrollbar order-3 flex w-full items-center gap-1 overflow-x-auto rounded-pill border border-border bg-surface p-1.5 shadow-2xs xl:order-none xl:w-auto"
      >
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-pill px-3.5 py-2 text-xs font-semibold transition-colors',
                active
                  ? 'bg-action text-action-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center justify-end gap-2.5 xl:ml-0">
        <form onSubmit={handleSearch} className="relative hidden w-56 md:block xl:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, milestones, sources..."
            aria-label="Search workspace"
            className="h-9 rounded-pill pr-12 pl-9 text-xs"
          />
          <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-control border border-border bg-surface-secondary px-1.5 text-[10px] font-bold text-muted-foreground">
            ⌘K
          </Kbd>
        </form>

        <Link
          href="/notifications"
          aria-label={hasUnread ? 'Notifications, unread' : 'Notifications'}
          className="relative flex size-9 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
        >
          <Bell className="size-4" />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent-tertiary ring-2 ring-surface"
            />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Profile"
              className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70"
            >
              {isLoading ? (
                <UserAvatarSkeleton />
              ) : (
                <Avatar className="size-9">
                  {user?.image && <AvatarImage src={user.image} alt={user?.name ?? 'User'} />}
                  <AvatarFallback className="bg-action text-xs font-bold text-action-foreground">
                    {(user?.name ?? 'N')[0]}
                  </AvatarFallback>
                </Avatar>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48 bg-popover-background">
            <DropdownMenuLabel>{user?.name ?? user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/settings')}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => signOut.mutate()}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
