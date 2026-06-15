import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchMenuList, type MenuSimpleDTO } from '@/shared/api/lookup/menu'
import { buildTreeFromFlat, type TreeNode } from '@/shared/lib/tree'

/**
 * Menu lookup hooks. Same eager-prefetch + in-memory-cache strategy as dept tree.
 */

export const MENU_QUERY_KEY = ['system', 'menu', 'all'] as const

export function prefetchMenuTree(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: fetchMenuList,
    staleTime: Infinity,
  })
}

function useMenuListQuery() {
  return useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: fetchMenuList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Raw flat list of all enabled menus from simple-list. */
export function useMenuList() {
  const { data, isLoading, isError } = useMenuListQuery()
  return { data: data ?? [], isLoading, isError }
}

/** Hierarchical tree built from flat simple-list. BUTTON nodes retained — filter in MenuTreeSelect. */
export function useMenuTree() {
  const { data, isLoading, isError } = useMenuListQuery()

  const tree = useMemo<TreeNode<MenuSimpleDTO>[]>(() => {
    if (!data) return []
    return buildTreeFromFlat(data, {
      getId: m => m.id,
      getParentId: m => m.parentId,
    })
  }, [data])

  return { data: tree, isLoading, isError }
}
