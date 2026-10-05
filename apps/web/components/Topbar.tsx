'use client';

import { useRouter } from 'next/navigation';
import { Bell, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useState } from 'react';

import { useMe } from '@/hooks/useMe';
import { isUser } from '@/lib/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

interface TopbarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Topbar({ collapsed, onToggle }: TopbarProps) {
  const router = useRouter();
  const { data } = useMe();
  const user = isUser(data) ? data : null;
  const [query, setQuery] = useState('');

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b-border bg-card px-4">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle sidebar"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
      </button>

      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent"
      >
        <span className="text-muted-foreground">Jordan&apos;s Workspace</span>
      </button>

      <form onSubmit={handleSearch} className="relative ml-auto w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, artifacts, files..."
          className={cn('pl-9')}
        />
      </form>

      <button
        type="button"
        onClick={() => router.push('/notifications')}
        aria-label="Notifications"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Bell className="size-5" />
      </button>

      <button type="button" onClick={() => router.push('/settings')} aria-label="Profile">
        <Avatar className="size-9">
          {user?.image && <AvatarImage src={user.image} alt={user?.name ?? 'User'} />}
          <AvatarFallback>{(user?.name ?? 'N')[0]}</AvatarFallback>
        </Avatar>
      </button>
    </header>
  );
}
