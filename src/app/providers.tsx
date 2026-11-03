"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { LanguageProvider } from "~/lib/i18n/LanguageProvider";
import type { Locale } from "~/lib/i18n/locale";
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
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </LanguageProvider>
  );
}
