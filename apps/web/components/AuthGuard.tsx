'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { useMe } from '@/hooks/useMe';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isPending } = useMe();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace('/login');
    }
  }, [isPending, user, router]);

  // if (isPending || !user) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center">
  //       <Spinner className="size-12" />
  //     </div>
  //   );
  // }

  return children;
}
