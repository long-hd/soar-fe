import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TableProps } from 'antd'
import { env } from '@/shared/lib/env'
import type { PageResult } from '@/shared/api/types'
import type { UseTableStateResult } from '@/shared/hooks/use-table-state'
import type { SortParams } from '@/shared/types/api'

/**
 * Wraps TanStack `useQuery` + builds antd `<Table>`-ready props in one hook.
 *
 * Per Q A5.2 = A — `tableProps` is spread-ready:
 * ```tsx
 *   const ts = useTableState<UserFilters>()
 *   const { tableProps } = usePagedQuery({
 *     queryKey: ['system', 'user'],
 *     queryFn: (params) => userApi.page(params),
 *     tableState: ts,
 *   })
 *   return <Table {...tableProps} columns={columns} rowKey="id" />
 * ```
 * Pagination strategy (Q A5 verdict): built-in `Table.pagination` only.
 * If a future page needs a custom-placed `<Pagination>`, extend this hook
 * to ALSO return raw `paginationProps` (see "Hybrid" note below).
 *
 * `keepPreviousData` (TanStack v5 `placeholderData: keepPreviousData`):
 *   While fetching a new page, the table keeps showing the old rows and
 *   `loading` flips true. Smooth pagination UX — no empty-table flicker.
 *
 * Query key:
 *   Caller passes a base key (e.g. `['system', 'user']`). We extend with
 *   `tableState.queryParams` → cache automatically segments by filters/page/sort.
 *
 * onChange (antd Table → table state bridge):
 *   - User clicks a sortable column header → antd fires onChange with new
 *     sorter. We normalize ('ascend'→'asc', 'descend'→'desc', null→undefined),
 *     and if sort actually changed, call setSort (which resets page to 1).
 *   - User clicks a different page → setPageNo.
 *   - User changes page size → setPageSize (resets page to 1).
 *   - antd column-filter (built-in `Column.filters`) — NOT supported here.
 *     Search forms are the Soar convention; column filters would conflict.
 *     The onChange handler ignores the `filters` arg.
 *   - Multi-sort: antd's array form is collapsed to first entry. Multi-sort
 *     UI isn't currently supported (Q A5.1 = A).
 */

export interface UsePagedQueryArgs<TItem, TFilters extends Record<string, unknown>> {
  /** Base query key. Extended internally with `tableState.queryParams` for cache segmentation. */
  queryKey: readonly unknown[]
  /** Fetcher. Receives BE-shaped params (`pageNo`, `pageSize`, `sortingFields?`, ...filters). */
  queryFn: (params: UseTableStateResult<TFilters>['queryParams']) => Promise<PageResult<TItem>>
  /** Table state returned by `useTableState`. */
  tableState: UseTableStateResult<TFilters>
  /** Disable the query (e.g., until a required dependency is ready). Default: true. */
  enabled?: boolean
}

export interface UsePagedQueryResult<TItem> {
  /** Current page items. Empty array while loading initially. */
  data: TItem[]
  /** Total item count from BE (for pagination total). */
  total: number
  /** True on initial fetch (no data yet). */
  isLoading: boolean
  /** True during any fetch (initial OR refetch on param change). */
  isFetching: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  /** Spread directly onto `<Table {...tableProps}>`. */
  tableProps: Pick<TableProps<TItem>, 'dataSource' | 'loading' | 'pagination' | 'onChange'>
}

export function usePagedQuery<
  TItem,
  TFilters extends Record<string, unknown> = Record<string, unknown>,
>(args: UsePagedQueryArgs<TItem, TFilters>): UsePagedQueryResult<TItem> {
  const { queryKey, queryFn, tableState, enabled = true } = args

  const fullKey = useMemo(
    () => [...queryKey, tableState.queryParams],
    [queryKey, tableState.queryParams],
  )

  const query = useQuery({
    queryKey: fullKey,
    queryFn: () => queryFn(tableState.queryParams),
    placeholderData: keepPreviousData,
    enabled,
  })

  const items = query.data?.list ?? []
  const total = query.data?.total ?? 0

  const tableProps = useMemo<UsePagedQueryResult<TItem>['tableProps']>(() => {
    return {
      dataSource: items,
      loading: query.isFetching,
      pagination: {
        current: tableState.pageNo,
        pageSize: tableState.pageSize,
        total,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: [...env.tablePageSizeOptions],
        showTotal: (n: number, range: [number, number]) => `${range[0]}-${range[1]} / ${n}`,
      },
      onChange: (pagination, _filters, sorter) => {
        const single = Array.isArray(sorter) ? sorter[0] : sorter
        const newSort = single?.order
          ? {
              field: String(single.field),
              order: single.order === 'ascend' ? 'asc' : ('desc' as const),
            }
          : undefined

        const sortChanged =
          newSort?.field !== tableState.sort?.field || newSort?.order !== tableState.sort?.order

        if (sortChanged) {
          const newSort: SortParams | undefined = single?.order
            ? {
                field: String(single.field),
                order: single.order === 'ascend' ? 'asc' : 'desc',
              }
            : undefined
          tableState.setSort(newSort)
          return
        }
        if (pagination.pageSize && pagination.pageSize !== tableState.pageSize) {
          tableState.setPageSize(pagination.pageSize)
          return
        }
        if (pagination.current && pagination.current !== tableState.pageNo) {
          tableState.setPageNo(pagination.current)
        }
      },
    }
  }, [items, query.isFetching, tableState, total])

  return {
    data: items,
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    tableProps,
  }
}
