import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { fetchDictTypeList } from '@/shared/api/lookup/dict-type'

/**
 * Dict type lookup hooks. Same eager-prefetch + in-memory-cache strategy as post (A3).
 */

export const DICT_TYPE_LOOKUP_QUERY_KEY = ['system', 'dict-type', 'lookup'] as const

export function prefetchDictTypeList(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: DICT_TYPE_LOOKUP_QUERY_KEY,
    queryFn: fetchDictTypeList,
    staleTime: Infinity,
  })
}

function useDictTypeListQuery() {
  return useQuery({
    queryKey: DICT_TYPE_LOOKUP_QUERY_KEY,
    queryFn: fetchDictTypeList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Flat list of all dictionary types (enabled + disabled). */
export function useDictTypeSimpleList() {
  const { data, isLoading, isError } = useDictTypeListQuery()
  return { data: data ?? [], isLoading, isError }
}

/**
 * Look up the display name for a dict type code.
 * Returns undefined when loading, when type is null/undefined, or when not found.
 */
export function useDictTypeName(type: string | null | undefined): string | undefined {
  const { data } = useDictTypeSimpleList()
  if (type == null) return undefined
  return data.find(item => item.type === type)?.name
}
