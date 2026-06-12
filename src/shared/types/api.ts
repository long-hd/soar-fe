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
 * Single sort only.
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

export interface PageParams {
  pageNo: number
  pageSize: number
}

export interface SortablePageParam extends PageParams {
  sortingFields?: SortParams[]
}
