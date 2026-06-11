import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { fetchPostList } from '@/shared/api/lookup/post'

/**
 * Post lookup hooks. Same eager-prefetch + in-memory-cache strategy as dict (A2) + dept (A3).
 *
 * Simpler than dept — no tree builder, no derived hooks beyond list + name lookup.
 *
 * legacy reference: post fetched in user form + post admin page. No store; fetched
 * per consumer. Soar's shared TanStack Query cache = single fetch reused everywhere
 * (minor improvement over legacy).
 */

export const POST_QUERY_KEY = ['system', 'post', 'all'] as const

export function prefetchPostList(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: POST_QUERY_KEY,
    queryFn: fetchPostList,
    staleTime: Infinity,
  })
}

function usePostListQuery() {
  return useQuery({
    queryKey: POST_QUERY_KEY,
    queryFn: fetchPostList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Raw flat list of all enabled posts. */
export function usePostList() {
  const { data, isLoading, isError } = usePostListQuery()
  return { data: data ?? [], isLoading, isError }
}

/**
 * Look up the name for a post id. Returns undefined when loading, when id is
 * null/undefined, or when the id doesn't exist in post data.
 */
export function usePostName(id: number | null | undefined): string | undefined {
  const { data } = usePostList()
  if (id == null) return undefined
  return data.find(p => p.id === id)?.name
}
