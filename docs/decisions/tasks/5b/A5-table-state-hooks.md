# A5 — Table State Hooks

> Last foundation block before Task 2. Builds the table state + paged query infrastructure that every CRUD page will consume.

---

## Scope

4 files (1 patch + 3 new):

1. `src/shared/lib/env.ts` — PATCH — add `tableDefaultPage`, `tableDefaultPageSize`, `tablePageSizeOptions`
2. `src/shared/types/api.ts` — NEW — `SortParams` type aligned with BE `SortingField`
3. `src/shared/hooks/use-table-state.ts` — NEW — in-memory table state (filters + page + sort)
4. `src/shared/hooks/use-paged-query.ts` — NEW — wraps TanStack `useQuery` + auto-builds antd `<Table>` props

No URL sync (per Q1=B). Activity keep-alive from A0 preserves state on tab switch.

---

## 1. `src/shared/lib/env.ts` (patch)

Add 3 properties to the existing `env` object:

**Find** the existing `env` const block:

```typescript
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const
```

**Replace with**:

```typescript
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,

  // Table defaults (Q A5.3 / A5.4 — yudao parity).
  // Hardcoded for now; expose as VITE_TABLE_* env vars later if per-deploy
  // tuning becomes necessary.
  tableDefaultPage: 1,
  tableDefaultPageSize: 10,
  tablePageSizeOptions: [10, 20, 30, 50, 100] as const,
} as const
```

---

## 2. `src/shared/types/api.ts` (new file)

```typescript
/**
 * Shared API types for cross-cutting concerns (sorting, ...).
 *
 * Domain-specific request/response types live in `features/<x>/types.ts`.
 * This file is for shapes used by `shared/` infrastructure.
 */

/**
 * Sort parameter aligned with BE `SortingField` shape:
 *   soar-framework/soar-common/src/main/java/com/hdl/soar/framework/common/pojo/SortingField.java
 *
 * Single sort only (Q A5.1 = A). yudao parity.
 *
 * The hook `useTableState` stores at most one `SortParams`; `usePagedQuery`
 * serializes it into the request body as `sortingFields: [SortParams]` (an array
 * of one), matching BE's `SortablePageParam.sortingFields: List<SortingField>`.
 *
 * antd Table's `onChange` returns `'ascend' | 'descend' | null`. The
 * `usePagedQuery` adapter converts: `ascend → asc`, `descend → desc`, `null → undefined`.
 *
 * The BE Page DTO must extend `SortablePageParam` to receive sort. DTOs that
 * extend only `PageParam` ignore sort silently — safe default.
 */
export interface SortParams {
  field: string
  order: 'asc' | 'desc'
}
```

---

## 3. `src/shared/hooks/use-table-state.ts` (new file)

```typescript
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
  const [pageNo, setPageNoState] = useState(env.tableDefaultPage)
  const [pageSize, setPageSizeState] = useState(env.tableDefaultPageSize)
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
```

---

## 4. `src/shared/hooks/use-paged-query.ts` (new file)

```typescript
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TableProps } from 'antd'
import { env } from '@/shared/lib/env'
import type { PageResult } from '@/shared/api/types'
import type { UseTableStateResult } from '@/shared/hooks/use-table-state'

/**
 * Wraps TanStack `useQuery` + builds antd `<Table>`-ready props in one hook.
 *
 * Per Q A5.2 = A — `tableProps` is spread-ready:
 *
 *   const ts = useTableState<UserFilters>()
 *   const { tableProps } = usePagedQuery({
 *     queryKey: ['system', 'user'],
 *     queryFn: (params) => userApi.page(params),
 *     tableState: ts,
 *   })
 *   return <Table {...tableProps} columns={columns} rowKey="id" />
 *
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
```

---

## Notes on subtle points

### Type derivation lesson applied (from Long's A3 fix)

`tableProps` typed as `Pick<TableProps<TItem>, 'dataSource' | 'loading' | 'pagination' | 'onChange'>` — derived from antd's actual `<Table>` prop type, not a custom-defined shape. Future antd upgrades changing internal types stay compatible.

### Why `Pick` instead of returning full `TableProps`

Forces caller to provide `columns`, `rowKey`, etc. explicitly — those are inherently page-specific. Auto-providing them would over-constrain.

### `keepPreviousData` over `keepPreviousData: true`

TanStack Query v5 changed API: instead of boolean, pass the `keepPreviousData` placeholder function. Imported from `@tanstack/react-query`. Same effect — old data visible while new fetch in flight.

### `enabled` prop

Common case: a CRUD page depends on a parent context (e.g., role-detail page needs a roleId from URL). Until roleId resolved, query shouldn't fire. Caller passes `enabled: !!roleId`.

### Why hook accepts `tableState` instead of owning it

Page may need to react to `tableState` outside the query — e.g., show a "Filter active" badge when `Object.keys(filters).length > 0`. Keeping state external lets page introspect.

### Query key extension

Caller provides `['system', 'user']`. Internally we extend to `['system', 'user', queryParams]`. TanStack treats different params as different cache entries → switching filters refetches cleanly without manual invalidation.

For explicit refetch (e.g., after a mutation): the page should call `queryClient.invalidateQueries({ queryKey: ['system', 'user'] })` — this invalidates ALL pages of user data (any filters), forcing fresh fetch on the active params.

### Why `sortingFields` is array of one (not a single object)

BE shape: `List<SortingField>`. Even when sending one sort, BE expects a list. The conversion in `useTableState.queryParams` wraps single `sort` into `[sort]`.

### Migration path to "hybrid" (Q clarification from Long)

If a future page wants `<Pagination>` standalone (separate from Table), extend the hook return:

```typescript
// future addition — non-breaking
paginationProps: {
  current: tableState.pageNo,
  pageSize: tableState.pageSize,
  total,
  onChange: (page, size) => tableState.setPageAndSize(page, size),
  // ... other pagination props
}
```

Page can then do `<Table {...tableProps} pagination={false} /> <Pagination {...paginationProps} />`. ~10 lines extra. Existing consumers using `tableProps` unaffected.

---

## Smoke test

Inline in welcome screen. Mock fetcher returns static data.

```tsx
import { Table } from 'antd'
import { useTableState } from '@/shared/hooks/use-table-state'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import type { PageResult } from '@/shared/api/types'

interface MockRow {
  id: number
  name: string
  status: number
}
interface MockFilters extends Record<string, unknown> {
  name?: string
}

const ALL_ROWS: MockRow[] = Array.from({ length: 47 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  status: i % 2,
}))

async function mockFetch(
  params: { pageNo: number; pageSize: number } & MockFilters,
): Promise<PageResult<MockRow>> {
  await new Promise(r => setTimeout(r, 300)) // simulate latency
  const filtered = params.name
    ? ALL_ROWS.filter(r => r.name.toLowerCase().includes(String(params.name).toLowerCase()))
    : ALL_ROWS
  const start = (params.pageNo - 1) * params.pageSize
  return { list: filtered.slice(start, start + params.pageSize), total: filtered.length }
}

function TableSmoke() {
  const ts = useTableState<MockFilters>()
  const { tableProps, total } = usePagedQuery({
    queryKey: ['mock'],
    queryFn: mockFetch,
    tableState: ts,
  })
  return (
    <div style={{ padding: 24 }}>
      <p>
        Page {ts.pageNo}, size {ts.pageSize}, total {total}, sort:{' '}
        {ts.sort ? `${ts.sort.field} ${ts.sort.order}` : 'none'}
      </p>
      <button onClick={() => ts.setFilters({ name: 'Item 1' })}>Filter "Item 1"</button>
      <button onClick={() => ts.clearFilters()}>Clear</button>
      <Table
        {...tableProps}
        rowKey="id"
        columns={[
          { title: 'ID', dataIndex: 'id', sorter: true },
          { title: 'Name', dataIndex: 'name', sorter: true },
          { title: 'Status', dataIndex: 'status' },
        ]}
      />
    </div>
  )
}
// then <TableSmoke /> in the welcome JSX
```

| #    | Step                                                | Expected                                                                                                                    |
| ---- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A5-1 | Render.                                             | Table loads page 1, shows 10 rows (IDs 1-10), total=47. Pagination footer shows "1-10 / 47" + page numbers + size selector. |
| A5-2 | Click page 2 in pagination.                         | Briefly `loading=true` (old rows still visible — keepPreviousData), then page 2 rows (IDs 11-20).                           |
| A5-3 | Change page size to 20.                             | Resets to page 1, shows IDs 1-20.                                                                                           |
| A5-4 | Click "Filter Item 1" button.                       | Resets to page 1. Filtered total drops to ~11 (Item 1, 10, 11, 12, ...).                                                    |
| A5-5 | Click "Clear".                                      | Filters cleared, total back to 47, page 1.                                                                                  |
| A5-6 | Click ID column header (sort ascending).            | `sort: id asc` shown. Table re-sorts.                                                                                       |
| A5-7 | Click ID header again (descending).                 | `sort: id desc`. Table reverses.                                                                                            |
| A5-8 | Click ID header 3rd time (clear sort).              | `sort: none`.                                                                                                               |
| A5-9 | While on page 3 with sort active, change page size. | Page resets to 1 (per useTableState semantics), sort preserved.                                                             |

After verifying, remove test block.

---

## Apply checklist

- [ ] Patch `src/shared/lib/env.ts` — add `tableDefaultPage`, `tableDefaultPageSize`, `tablePageSizeOptions`.
- [ ] Create `src/shared/types/api.ts`.
- [ ] Create `src/shared/hooks/use-table-state.ts`.
- [ ] Create `src/shared/hooks/use-paged-query.ts`.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm lint` passes.
- [ ] Inject smoke block in welcome → A5-1..A5-9 → revert.

---

## Tracker updates (for A5)

Add to `TECH_DEBT.md § Open § Low`:

| ID     | Title                                  | Opened | Target                                     | Cross-ref | Notes                                                                                                                                                                          |
| ------ | -------------------------------------- | ------ | ------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A5-TD1 | No URL sync for table state            | 5B/A5  | Phase 5C if share-link UX needed           | —         | Per Q1=B. State preserved across tab switch via Activity (A0). F5 loses state. URL sync would be ~30 lines extra in useTableState reading/writing searchParams.                |
| A5-TD2 | antd column `filters` prop unsupported | 5B/A5  | If a page genuinely needs column-filter UI | —         | Soar convention is external search form. `usePagedQuery.onChange` ignores antd's column filter arg. If needed, the bridge handler can be extended to dispatch to `setFilters`. |
| A5-TD3 | Multi-sort unsupported                 | 5B/A5  | If a page needs multi-column sort          | —         | Q A5.1=A. `usePagedQuery` collapses antd's array form to first entry. BE already supports multi via `sortingFields: List<>` — only FE bridge + UX work needed.                 |

Move from Open to Resolved: **none**.

Update stats snapshot:

```
- 5B/A5 (table state): 3 open (all low)
- Total open: 26 (was 23)
- Total resolved: 10 (unchanged)
```

Distribution by severity (post-A5):

- High: 1 (#11)
- Medium: 5
- Low: 20

---

**End A5. Foundation complete (A0-A5 + AA). Next: Task 2 — `system/user` CRUD page.**
