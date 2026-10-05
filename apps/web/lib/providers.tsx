'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { onboardingKeys } from '@/hooks/queryKeys';

function shouldDehydrateQuery(query: { queryKey: readonly unknown[] }): boolean {
  // Persist only the onboarding draft to localStorage — server queries stay in-memory.
  const key = onboardingKeys.draft;
  return query.queryKey.length === key.length && query.queryKey.every((part, i) => part === key[i]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Persister needs window; on the SSR render pass, fall back to a plain provider.
  const [persister] = useState(() =>
    typeof window === 'undefined'
      ? undefined
      : createSyncStoragePersister({
          storage: window.localStorage,
          key: 'nexus.query-cache',
        }),
  );

  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        dehydrateOptions: { shouldDehydrateQuery },
      }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
