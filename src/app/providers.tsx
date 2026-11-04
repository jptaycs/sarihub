"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { LanguageProvider } from "~/lib/i18n/LanguageProvider";
import type { Locale } from "~/lib/i18n/locale";
import { PERSIST_MAX_AGE_MS, createCatalogPersister, isPersistedQuery } from "~/lib/queryPersist";
import { trpc } from "~/lib/trpc/client";

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Focus refetch only fires for stale queries (>30s), so a PWA
          // resumed from the background shows a fresh balance/status
          // without hammering the API while the user is active.
          queries: { staleTime: 30_000, refetchOnWindowFocus: true, refetchOnReconnect: true },
        },
      }),
  );
  const [persister] = useState(() => createCatalogPersister());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: PERSIST_MAX_AGE_MS,
            // Only the public price list is kept on the phone; see queryPersist.ts.
            dehydrateOptions: { shouldDehydrateQuery: (query) => isPersistedQuery(query.queryKey) },
          }}
        >
          {children}
        </PersistQueryClientProvider>
      </trpc.Provider>
    </LanguageProvider>
  );
}
