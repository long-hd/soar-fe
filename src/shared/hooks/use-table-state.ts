import { useMemo, useState } from 'react'
import { env } from '@/shared/lib/env'
import type { SortParams } from '@/shared/types/api'

/**
 * In-memory table state: page, page size, filters, sort.
 *
 * Ported from `acc-logistic-rmk-fe/src/shared/hooks/use-table-state.ts` with
 * Soar-specific adjustments:
 *  - Field name `page` → `pageNo` (BE `PageParam.pageNo`)
 *  - Tighter `SortParams` type (acc used `any`)
 *  - `queryParams` outputs BE-ready shape: `{ pageNo, pageSize, sortingFields?, ...filters }`
 *
 * Reset-to-page-1 semantics (internal):
 *  - `setFilters` / `setSort` / `setPageSize` reset `pageNo` to default (1)
 *  - `setPageNo` does NOT reset anything
 *  - `clearFilters` resets filters + page (sort retained — user may want to
 *    keep sort across filter clears)
 *  - `reset` clears everything
 *
 * Activity keep-alive (A0) preserves this state when user switches tabs.
 * F5 loses state — acceptable for Phase 5B (no URL sync, per Q1=B).
 */

export interface UseTableStateResult<TFilters extends Record<string, unknown>> {
  // State
  pageNo: number
  pageSize: number
  filters: TFilters
  sort: SortParams | undefined

  // BE-ready request params (memoized)
  queryParams: {
    pageNo: number
    pageSize: number
    sortingFields?: SortParams[]
  } & TFilters

  // Actions
  setPageNo: (n: number) => void
  setPageSize: (n: number) => void
  setPageAndSize: (n: number, s: number) => void
  setFilters: (patch: Partial<TFilters>) => void
  setSort: (sort: SortParams | undefined) => void
  clearFilters: () => void
  reset: () => void
}

export function useTableState<TFilters extends Record<string, unknown>>(
  initialFilters: TFilters = {} as TFilters,
  initialSort?: SortParams,
): UseTableStateResult<TFilters> {
  const [pageNo, setPageNoState] = useState<number>(env.tableDefaultPage)
  const [pageSize, setPageSizeState] = useState<number>(env.tableDefaultPageSize)
  const [filters, setFiltersState] = useState<TFilters>(initialFilters)
  const [sort, setSortState] = useState<SortParams | undefined>(initialSort)

  const setPageNo = (n: number) => setPageNoState(n)

  const setPageSize = (n: number) => {
    setPageSizeState(n)
    setPageNoState(env.tableDefaultPage)
  }

  const setPageAndSize = (n: number, s: number) => {
    setPageNoState(n)
    setPageSizeState(s)
  }

  const setFilters = (patch: Partial<TFilters>) => {
    setFiltersState(prev => ({ ...prev, ...patch }))
    setPageNoState(env.tableDefaultPage)
  }

  const setSort = (newSort: SortParams | undefined) => {
    setSortState(newSort)
    setPageNoState(env.tableDefaultPage)
  }

  const clearFilters = () => {
    setFiltersState(initialFilters)
    setPageNoState(env.tableDefaultPage)
  }

  const reset = () => {
    setFiltersState(initialFilters)
    setSortState(initialSort)
    setPageNoState(env.tableDefaultPage)
    setPageSizeState(env.tableDefaultPageSize)
  }

  const queryParams = useMemo(() => {
    return {
      pageNo,
      pageSize,
      ...filters,
      // Omit sortingFields key entirely when no sort active.
      // BE DTOs extending only PageParam ignore the key; DTOs extending
      // SortablePageParam treat absent key as "no sort, use default order".
      ...(sort ? { sortingFields: [sort] } : {}),
    } as UseTableStateResult<TFilters>['queryParams']
  }, [pageNo, pageSize, filters, sort])

  return {
    pageNo,
    pageSize,
    filters,
    sort,
    queryParams,
    setPageNo,
    setPageSize,
    setPageAndSize,
    setFilters,
    setSort,
    clearFilters,
    reset,
  }
}
