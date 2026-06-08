import { QueryClient } from '@tanstack/react-query'

/**
 * Soar TanStack Query client. Defaults from AGENTS.md §State Management Split.
 *
 * Used once at module load — providers.tsx hands this to QueryClientProvider.
 *
 * Rationale per default:
 * - `staleTime 5min`: list/detail data tolerates a few minutes of staleness;
 *   avoids re-fetching on every mount of the same query.
 * - `gcTime 30min`: cache retained 30 min after the last subscriber unmounts —
 *   tab close/reopen reuses cache.
 * - `retry: 1`: one automatic retry on transient network failures; more would
 *   delay user-visible errors.
 * - `refetchOnWindowFocus: false`: admin app, not a live dashboard. Re-focus
 *   refetch is noisy in CRUD workflows.
 * - `mutations.retry: 0`: never auto-retry mutations (avoid duplicate writes).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
