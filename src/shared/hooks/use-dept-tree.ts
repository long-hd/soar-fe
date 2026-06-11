import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchDeptList, type DeptSimpleDTO } from '@/shared/api/lookup/dept'
import { buildTreeFromFlat, type TreeNode } from '@/shared/lib/tree'

/**
 * Dept lookup hooks. Same eager-prefetch + in-memory-cache strategy as dict.
 *
 * - `prefetchDeptTree` called once from AppShell mount.
 * - Tree shape built once in `useDeptTree`, memoized against the underlying data
 *   array reference — only rebuilds when dept data changes (e.g., after dept
 *   admin mutation invalidates the cache).
 * - `useDeptList` for raw flat list (when tree shape unnecessary).
 * - `useDeptName(id)` for read-only label lookup — symmetric to `useDictLabel`.
 *
 * legacy reference: dept fetched eagerly in dept admin page + dept select component.
 *   Tree built each time via `handleTree(list)` — no shared memoization. Soar's
 *   shared memoization is a minor improvement.
 */

export const DEPT_QUERY_KEY = ['system', 'dept', 'all'] as const

export function prefetchDeptTree(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: DEPT_QUERY_KEY,
    queryFn: fetchDeptList,
    staleTime: Infinity,
  })
}

function useDeptListQuery() {
  return useQuery({
    queryKey: DEPT_QUERY_KEY,
    queryFn: fetchDeptList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Raw flat list of all depts. */
export function useDeptList() {
  const { data, isLoading, isError } = useDeptListQuery()
  return { data: data ?? [], isLoading, isError }
}

/** Hierarchical tree built from flat list. Memoized. */
export function useDeptTree() {
  const { data, isLoading, isError } = useDeptListQuery()

  const tree = useMemo<TreeNode<DeptSimpleDTO>[]>(() => {
    if (!data) return []
    return buildTreeFromFlat(data, {
      getId: d => d.id,
      getParentId: d => d.parentId,
    })
  }, [data])

  return { data: tree, isLoading, isError }
}

/**
 * Look up the name for a dept id. Returns undefined when loading, when id is
 * null/undefined, or when the id doesn't exist in dept data.
 *
 * Use when BE response doesn't include the joined `deptName` field. For
 * user/role tables BE already returns `deptName` — prefer that over re-lookup.
 */
export function useDeptName(id: number | null | undefined): string | undefined {
  const { data } = useDeptList()
  if (id == null) return undefined
  return data.find(d => d.id === id)?.name
}
