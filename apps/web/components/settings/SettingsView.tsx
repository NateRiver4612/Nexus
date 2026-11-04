'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/useMe';
import { useSignOut } from '@/hooks/useSignOut';

const ProfileSkeleton = () => {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  );
};

export function SettingsView() {
  const { data: user, isLoading } = useMe();
  const signOut = useSignOut();

  const fallback = (user?.name ?? user?.email ?? 'N').charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              {user?.image && <AvatarImage src={user.image} alt={user?.name ?? 'User'} />}
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.name ?? '—'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Sign out</p>
            <p className="text-sm text-muted-foreground">End your current session.</p>
          </div>
          <Button variant="outline" onClick={() => signOut.mutate()} isLoading={signOut.isPending}>
            Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}
