import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchDictDataList, type DictDataSimpleDTO } from '@/shared/api/lookup/dict'

/**
 * Dict data lookup hooks.
 *
 * Caching strategy:
 *  - `AppShell` mounts after authentication → calls `prefetchDictData(queryClient)`
 *    once. This fires the BE request in the background, fire-and-forget.
 *  - Subsequent `useDictData` / `useDictDataAll` / `<DictSelect>` / `<DictTag>`
 *    consumers hit the populated cache without triggering new fetches.
 *  - `staleTime: Infinity` + `gcTime: Infinity` → no auto-refetch within the
 *    React app lifetime.
 *  - The dict admin CRUD page (port loop) MUST call
 *      `queryClient.invalidateQueries({ queryKey: DICT_QUERY_KEY })`
 *    after any dict mutation to refresh consumers.
 */

export const DICT_QUERY_KEY = ['system', 'dict', 'all'] as const

/**
 * Trigger dict data prefetch. Idempotent — TanStack Query dedupes if the
 * key is already in-flight or cached. Safe to call from multiple places.
 *
 * Called by AppShell on mount (after auth). Fire-and-forget — caller should
 * not await; UI components handle the brief loading state gracefully.
 */
export function prefetchDictData(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: DICT_QUERY_KEY,
    queryFn: fetchDictDataList,
    staleTime: Infinity,
  })
}

function useDictListQuery() {
  return useQuery({
    queryKey: DICT_QUERY_KEY,
    queryFn: fetchDictDataList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/**
 * @returns All dictionary entries grouped by `dictType`. Empty map while loading.
 * @example
 * ```ts
 * const { data, isLoading, isError } = useDictDataAll()
 * console.log(data) // Map<string, DictDataSimpleDTO[]>
 * ```
 */
export function useDictDataAll() {
  const { data, isLoading, isError } = useDictListQuery()

  const map = useMemo(() => {
    const out = new Map<string, DictDataSimpleDTO[]>()
    if (!data) return out
    for (const item of data) {
      const existing = out.get(item.dictType)
      if (existing) existing.push(item)
      else out.set(item.dictType, [item])
    }
    return out
  }, [data])

  return { data: map, isLoading, isError }
}

/**
 * @returns Items for a single dict type. Empty array if loading or type doesn't exist.
 * @example
 * ```ts
 * const { data, isLoading, isError } = useDictData('common_status')
 * console.log(data) // DictDataSimpleDTO[]
 * ```
 */
export function useDictData(dictType: string) {
  const { data, isLoading, isError } = useDictDataAll()
  const items = useMemo(() => data.get(dictType) ?? [], [data, dictType])
  return { data: items, isLoading, isError }
}

/**
 * Look up the full entry for a (type, value) pair.
 * Returns undefined when loading, when value is null/undefined, or when the
 * (type, value) combination doesn't exist in dict data.
 *
 * @param dictType - The dictionary type to look up.
 * @param value - The value to look up.
 * @returns The dictionary entry or undefined.
 * @example
 * ```ts
 * const entry = useDictEntry('common_status', 1)
 * console.log(entry?.label) // "Enabled"
 * ```
 */
export function useDictEntry(
  dictType: string,
  value: string | number | null | undefined,
): DictDataSimpleDTO | undefined {
  const { data } = useDictData(dictType)
  if (value == null) return undefined
  const target = String(value)
  return data.find(d => d.value === target)
}

/**
 * @returns The label for a single dict type. Undefined if loading or value is null/undefined.
 * @example
 * ```ts
 * const label = useDictLabel('common_status', 1)
 * console.log(label) // "Enabled"
 * ```
 */
export function useDictLabel(
  dictType: string,
  value: string | number | null | undefined,
): string | undefined {
  return useDictEntry(dictType, value)?.label
}
