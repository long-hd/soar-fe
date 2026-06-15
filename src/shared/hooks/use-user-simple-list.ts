import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import { fetchUserSimpleList } from '@/shared/api/lookup/user'

/**
 * User simple-list lookup hook. Same cache strategy as post/dept lookups.
 */

export const USER_SIMPLE_QUERY_KEY = ['system', 'user', 'simple'] as const

export function prefetchUserSimpleList(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: USER_SIMPLE_QUERY_KEY,
    queryFn: fetchUserSimpleList,
    staleTime: Infinity,
  })
}

function useUserSimpleListQuery() {
  return useQuery({
    queryKey: USER_SIMPLE_QUERY_KEY,
    queryFn: fetchUserSimpleList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Raw flat list of all enabled users (for selects and nickname lookup). */
export function useUserSimpleList() {
  const { data, isLoading, isError } = useUserSimpleListQuery()
  return { data: data ?? [], isLoading, isError }
}
