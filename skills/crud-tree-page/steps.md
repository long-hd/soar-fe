# crud-tree-page — Build Steps

> Step-by-step recipe for tree variant CRUD. Read `decisions.md` Q0 first to confirm BE is a tree variant.
> This document extends `crud-page/steps.md` — only tree-specific deltas documented here. Refer to base skill for steps unchanged.

---

## Build order (15 steps)

Phases:

- **Setup** (steps 1-2): types, constants
- **Data layer** (steps 3-4): api, hooks
- **Foundation** (steps 5-7): tree lookup, shared tree picker (Rule of Two extract)
- **UI** (steps 8-10): search form, form modal, list page
- **Page** (step 11): wrapper
- **i18n** (step 12): EN + VI
- **Verify** (steps 13-15): type-check, lint, smoke

If foundation `<{Entity}TreeSelect>` already exists from prior block: skip steps 5-7 (extension only if Q5 type filter or Q8 race guard prop missing).

---

## Step 1 — Define types

`src/features/system/{entity}/types.ts`

Inherits from `crud-page/steps.md` Step 1. Tree-specific addition:

```typescript
import type { TreeNode } from '@/shared/lib/tree'

export interface {Entity}RespDTO {
  id: number
  name: string
  parentId: number       // 0 = root (BE convention)
  // ... other fields per BE
  createTime: string
}

export interface {Entity}SaveReqDTO {
  id?: number
  name: string
  parentId?: number      // UI: undefined = root; submit: ?? 0
  // ... etc
}

export interface {Entity}Filters {
  name?: string
  status?: number
  // NO createTime range (typically not in tree List DTO)
}

export type {Entity}TreeNode = TreeNode<{Entity}RespDTO>
```

**Notes**:

- `parentId` typed as `number` (not optional in RespDTO — BE sets 0 for root). In SaveReqDTO optional because FE submits `undefined → 0`.
- `{Entity}TreeNode` alias for ergonomic use in list page.

---

## Step 2 — Constants

`src/features/system/{entity}/constants.ts`

Identical to `crud-page/steps.md` Step 2. Tree-specific addition:

```typescript
import { COMMON_STATUS } from '@/shared/constants/dict-types'

export const {ENTITY}_PERMISSIONS = {
  query:  'system:{entity}:query',
  create: 'system:{entity}:create',
  update: 'system:{entity}:update',
  delete: 'system:{entity}:delete',
} as const

export const {ENTITY}_DICT_TYPES = {
  status: COMMON_STATUS,
} as const

export const {ENTITY}_STATUS = {
  ENABLED:  0,
  DISABLED: 1,
} as const
```

---

## Step 3 — API client

`src/features/system/{entity}/api/index.ts`

Key delta: `list` returns array, NOT paginated:

```typescript
import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'
import type { {Entity}Filters, {Entity}RespDTO, {Entity}SaveReqDTO } from '../types'

const BASE = '/admin-api/system/{entity}'

export const {entity}Api = {
  list: async (filters: {Entity}Filters = {}): Promise<{Entity}RespDTO[]> => {
    const res = await request.get<CommonResult<{Entity}RespDTO[]>>(`${BASE}/list`, { params: filters })
    return res.data.data
  },
  get: async (id: number): Promise<{Entity}RespDTO> => {
    const res = await request.get<CommonResult<{Entity}RespDTO>>(`${BASE}/get`, { params: { id } })
    return res.data.data
  },
  create: async (data: {Entity}SaveReqDTO): Promise<number> => {
    const res = await request.post<CommonResult<number>>(`${BASE}/create`, data)
    return res.data.data
  },
  update: async (data: {Entity}SaveReqDTO): Promise<boolean> => {
    const res = await request.put<CommonResult<boolean>>(`${BASE}/update`, data)
    return res.data.data
  },
  delete: async (id: number): Promise<boolean> => {
    const res = await request.delete<CommonResult<boolean>>(`${BASE}/delete`, { params: { id } })
    return res.data.data
  },
  deleteList: async (ids: number[]): Promise<boolean> => {
    const res = await request.delete<CommonResult<boolean>>(`${BASE}/delete-list`, { params: { ids: ids.join(',') } })
    return res.data.data
  },
}
```

No `page` method. No `/page` endpoint touched.

---

## Step 4 — Hooks (queries + mutations)

`src/features/system/{entity}/hooks/index.ts`

**Key deltas vs `crud-page/`**:

1. **No `usePagedQuery`** — use `useQuery` directly
2. **Add `fullList` query key** for modal (Q7)
3. **Dual invalidation** if foundation lookup exists (Q11)
4. **Add `bootstrapAuth` dispatch** if Q10 applies

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'
import { {ENTITY}_QUERY_KEY } from '@/shared/hooks/use-{entity}-tree'  // foundation lookup key
import { {entity}Api } from '../api'
import type { {Entity}Filters, {Entity}SaveReqDTO } from '../types'

const {ENTITY}_ADMIN_QUERY_KEY = ['system', '{entity}'] as const

export const sys{Entity}QueryKey = {
  all:      {ENTITY}_ADMIN_QUERY_KEY,
  detail:   (id: number) => [...{ENTITY}_ADMIN_QUERY_KEY, 'detail', id] as const,
  list:     (filters: {Entity}Filters) => [...{ENTITY}_ADMIN_QUERY_KEY, 'list', filters] as const,
  fullList: [...{ENTITY}_ADMIN_QUERY_KEY, 'full-list'] as const,
}

export function use{Entity}ListQuery(filters: {Entity}Filters) {
  return useQuery({
    queryKey: sys{Entity}QueryKey.list(filters),
    queryFn: () => {entity}Api.list(filters),
    staleTime: 5 * 60_000,
  })
}

export function use{Entity}FullListQuery({ enabled }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: sys{Entity}QueryKey.fullList,
    queryFn: () => {entity}Api.list({}),
    enabled: enabled ?? true,
    staleTime: 60_000,
  })
}

export function use{Entity}DetailQuery(id: number | undefined, { enabled }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: sys{Entity}QueryKey.detail(id ?? 0),
    queryFn: () => {entity}Api.get(id!),
    enabled: (enabled ?? true) && id != null,
    staleTime: 60_000,
  })
}

export function use{Entity}Mutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: {ENTITY}_ADMIN_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: {ENTITY}_QUERY_KEY })   // foundation lookup
  }

  const create = useMutation({
    mutationFn: (data: {Entity}SaveReqDTO) => {entity}Api.create(data),
    onSuccess: () => {
      message.success(t('system{Entity}.messages.createSuccess'))
      invalidateAll()
    },
  })

  const update = useMutation({
    mutationFn: (data: {Entity}SaveReqDTO) => {entity}Api.update(data),
    onSuccess: () => {
      message.success(t('system{Entity}.messages.updateSuccess'))
      invalidateAll()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => {entity}Api.delete(id),
    onSuccess: () => {
      message.success(t('system{Entity}.messages.deleteSuccess'))
      invalidateAll()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => {entity}Api.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('system{Entity}.messages.deleteBulkSuccess', { count: ids.length }))
      invalidateAll()
    },
  })

  return { create, update, remove, removeMany }
}
```

**If Q10 applies** (auth-slice refresh): add `dispatch(bootstrapAuth())` in `invalidateAll` or at end of each onSuccess:

```typescript
const dispatch = useAppDispatch()
const invalidateAll = () => {
  void queryClient.invalidateQueries({ queryKey: {ENTITY}_ADMIN_QUERY_KEY })
  void queryClient.invalidateQueries({ queryKey: {ENTITY}_QUERY_KEY })
  void dispatch(bootstrapAuth())
}
```

---

## Step 5 — Foundation: lookup API

`src/shared/api/lookup/{entity}.ts`

Same as `crud-page/` foundation lookup pattern:

```typescript
interface {Entity}SimpleDTO {
  id: number
  name: string
  parentId: number   // ← tree-specific addition
  // type?: number    // if Q5 type filter applies
}

const URL = '/admin-api/system/{entity}/simple-list'

export async function fetch{Entity}List(): Promise<{Entity}SimpleDTO[]> {
  const res = await request.get<CommonResult<{Entity}SimpleDTO[]>>(URL)
  return res.data.data
}
```

---

## Step 6 — Foundation: tree hook

`src/shared/hooks/use-{entity}-tree.ts`

Tree-specific — builds tree from flat list:

```typescript
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { fetch{Entity}List, type {Entity}SimpleDTO } from '@/shared/api/lookup/{entity}'
import { buildTreeFromFlat, type TreeNode } from '@/shared/lib/tree'

export const {ENTITY}_QUERY_KEY = ['system', '{entity}', 'all'] as const

export function prefetch{Entity}Tree(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: {ENTITY}_QUERY_KEY,
    queryFn: fetch{Entity}List,
    staleTime: Infinity,
  })
}

export function use{Entity}List() {
  return useQuery({
    queryKey: {ENTITY}_QUERY_KEY,
    queryFn: fetch{Entity}List,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function use{Entity}Tree(): { data: TreeNode<{Entity}SimpleDTO>[]; isLoading: boolean } {
  const { data, isLoading } = use{Entity}List()
  const tree = useMemo(
    () => buildTreeFromFlat(data ?? [], { getId: d => d.id, getParentId: d => d.parentId }),
    [data],
  )
  return { data: tree, isLoading }
}
```

---

## Step 7 — Foundation: shared `<{Entity}TreeSelect>`

`src/shared/components/{entity}-tree-select.tsx`

```typescript
import { TreeSelect, type TreeSelectProps } from 'antd'
import { useMemo } from 'react'
import { use{Entity}Tree } from '@/shared/hooks/use-{entity}-tree'

type TreeSelectNode = {
  title: string
  value: number
  disabled?: boolean
  children?: TreeSelectNode[]
}

// Q5 variant: if some types cannot be parent, filter recursively
function filterIneligible(items) {
  return items
    .filter(item => item.type !== INELIGIBLE_TYPE)
    .map(item => ({ ...item, children: item.children?.length ? filterIneligible(item.children) : undefined }))
}

function toTreeData(items, disabledIds?: number[]): TreeSelectNode[] {
  return items.map(item => ({
    title: item.name,
    value: item.id,
    disabled: disabledIds?.includes(item.id),
    children: item.children?.length ? toTreeData(item.children, disabledIds) : undefined,
  }))
}

type {Entity}TreeSelectProps = Omit<TreeSelectProps, 'treeData' | 'loading'> & {
  disabledIds?: number[]
  loading?: boolean   // Q8 race guard override
}

export function {Entity}TreeSelect({ disabledIds, loading: loadingOverride, ...props }: {Entity}TreeSelectProps) {
  const { data: tree, isLoading } = use{Entity}Tree()
  const treeData = useMemo(() => {
    const filtered = filterIneligible(tree)   // if Q5 applies
    return toTreeData(filtered, disabledIds)
  }, [tree, disabledIds])

  return (
    <TreeSelect
      showSearch={{ treeNodeFilterProp: 'title' }}
      treeDefaultExpandAll
      {...props}
      treeData={treeData}
      loading={isLoading || !!loadingOverride}
    />
  )
}
```

---

## Step 8 — Search form

`src/features/system/{entity}/components/{entity}-search-form.tsx`

Same as `crud-page/steps.md` Step 8 (flat CRUD search form). Tree-specific note: typically fewer filters than flat (name + status only; no createTime range usually).

---

## Step 9 — Form modal (tree-specific deltas)

`src/features/system/{entity}/components/{entity}-form-modal.tsx`

Critical deltas from `crud-page/`:

### 9.1 — Use full list query for disabledIds + uniqueness checks

```typescript
const fullListQuery = use{Entity}FullListQuery({ enabled: open })
const fullFlatList = useMemo(() => fullListQuery.data ?? [], [fullListQuery.data])
const parentPickerLocked = isEdit && fullListQuery.isLoading   // Q8
```

### 9.2 — Compute disabledIds

```typescript
const disabledIds = useMemo(() => {
  if (!isEdit || id == null || fullFlatList.length === 0) return undefined
  const fullTree = buildTreeFromFlat(fullFlatList, {
    getId: d => d.id,
    getParentId: d => d.parentId,
  })
  return [id, ...collectDescendantIds(fullTree, id, d => d.id)]
}, [isEdit, id, fullFlatList])
```

### 9.3 — 3 useEffects (lifecycle)

```typescript
// 1. Reset
useEffect(() => {
  if (open) form.resetFields()
}, [open, form])

// 2. Populate edit
useEffect(() => {
  if (!open || !detailQuery.data) return
  const d = detailQuery.data
  form.setFieldsValue({
    name: d.name,
    parentId: d.parentId === 0 ? undefined : d.parentId, // ← 0 → undefined
    // ... etc
    status: String(d.status),
  })
}, [open, detailQuery.data, form])

// 3. Preset parentId for Add Child
useEffect(() => {
  if (!open || isEdit) return
  if (parentIdPreset != null) form.setFieldsValue({ parentId: parentIdPreset })
}, [open, isEdit, parentIdPreset, form])
```

### 9.4 — Submit DTO

```typescript
const dto: {Entity}SaveReqDTO = {
  name: values.name.trim(),
  parentId: values.parentId ?? 0,   // ← undefined → 0
  // ... etc
  status: Number(values.status),
}
```

### 9.5 — Parent picker with race guard

```tsx
<Form.Item name="parentId" label={t('...form.parentId')}>
  <{Entity}TreeSelect
    allowClear
    placeholder={t('...form.parentIdPlaceholder')}
    disabledIds={disabledIds}
    disabled={parentPickerLocked}
    loading={parentPickerLocked}
  />
</Form.Item>
```

---

## Step 10 — List page (tree-specific)

`src/features/system/{entity}/pages/{entity}-list-page.tsx`

### 10.1 — State + tree memo

```typescript
const [filters, setFilters] = useState<{Entity}Filters>({})
const [expandedRowKeys, setExpandedRowKeys] = useState<number[] | undefined>(undefined)
const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
const [formModal, setFormModal] = useState<{ open: boolean; id?: number; parentIdPreset?: number }>({ open: false })

const listQuery = use{Entity}ListQuery(filters)
const flatList = useMemo(() => listQuery.data ?? [], [listQuery.data])
const parentIdById = useMemo(() => new Map(flatList.map(d => [d.id, d.parentId])), [flatList])

const tree = useMemo(
  () => buildTreeFromFlat(flatList, { getId: d => d.id, getParentId: d => d.parentId }),
  [flatList],
)

const hasActiveFilters = filters.name != null || filters.status != null
```

### 10.2 — Expanded keys derivation (Q3 auto-expand)

```typescript
const expandedRowKeys = useMemo(() => {
  if (!hasActiveFilters) return undefined
  return collectAncestorIds(
    flatList.map(d => d.id),
    id => parentIdById.get(id),
  )
}, [hasActiveFilters, flatList, parentIdById])
```

### 10.3 — Helpers

```typescript
const hasChildren = (record: {Entity}TreeNode) => (record.children?.length ?? 0) > 0
```

### 10.4 — Handlers

Same as `crud-page/steps.md` Step 10, plus Add Child:

```typescript
const handleAddChild = (record: {Entity}RespDTO) => {
  setFormModal({ open: true, parentIdPreset: record.id })
}
```

### 10.5 — Action column (3 buttons)

```tsx
{
  title: t('...table.actions'),
  width: 240,
  render: (_, record) => (
    <Space size="small">
      <HasPermission code={PERMS.update}>
        <Button type="link" size="small" onClick={() => handleEdit(record)}>{t('...edit')}</Button>
      </HasPermission>
      <HasPermission code={PERMS.create}>
        <Button type="link" size="small" onClick={() => handleAddChild(record)}>{t('...addChild')}</Button>
      </HasPermission>
      <HasPermission code={PERMS.delete}>
        {hasChildren(record) ? (
          <Tooltip title={t('...deleteHasChildren')}>
            <Button type="link" size="small" danger disabled>{t('...delete')}</Button>
          </Tooltip>
        ) : (
          <Button type="link" size="small" danger onClick={() => handleDeleteOne(record)}>{t('...delete')}</Button>
        )}
      </HasPermission>
    </Space>
  ),
}
```

### 10.6 — Table render

```tsx
<Table
  loading={isLoading}
  dataSource={tree}
  columns={columns}
  rowKey="id"
  pagination={false}                       // ← tree variant
  expandable={{
    defaultExpandAllRows: true,
    expandedRowKeys,                       // ← undefined when no filters, controlled when active
    onExpandedRowsChange: keys => setExpandedRowKeys(keys as number[]),
    childrenColumnName: 'children',
  }}
  rowSelection={{
    selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys as number[]),
    getCheckboxProps: record => ({ disabled: hasChildren(record as {Entity}TreeNode) }),
  }}
/>
```

---

## Step 11 — Page wrapper

`src/pages/system/{entity}/index.tsx`

Same as `crud-page/` — thin re-export.

---

## Step 12 — i18n

`src/shared/i18n/locales/{en,vi}/system-{entity}.json`

Tree-specific keys added on top of `crud-page/`:

```json
{
  "system{Entity}": {
    "actions": {
      "addChild": "Add Child",
      "deleteHasChildren": "Cannot delete: has children"
    },
    "form": {
      "parentId": "Parent",
      "parentIdPlaceholder": "Select parent (leave empty for root)"
    }
  }
}
```

---

## Step 13 — Type-check

```bash
pnpm type-check
```

Common errors specific to tree variant:

- `Type 'undefined' is not assignable to type 'number'` on parentId — verify load/submit mapping
- `Type 'never[]' is missing...children` — verify `TreeNode<T>` typing

---

## Step 14 — Lint

```bash
pnpm lint
```

---

## Step 15 — Smoke

15-step tree-specific smoke (extends `crud-page/` smoke):

- Tree expands by default
- Search → tree filters + auto-expand
- Reset → full tree, all expanded
- Create root entity → success
- Add Child → parent pre-set
- Edit → parent picker excludes self + descendants
- Delete leaf → success
- Delete parent with children → button disabled + tooltip
- Bulk select excludes parents → only leaves selectable
- Foundation cache: open another page using `<{Entity}TreeSelect>` → reflects changes
- (If Q10 applies) Sider refreshes immediately after mutation

---

## Skipped (inherited from crud-page/)

- Step 1 base type definitions (only tree-specific deltas above)
- Step 2 base constants
- Step 3 base CRUD api methods (only `list` delta)
- Step 4 base hooks (only tree-specific additions)
- Step 8 base search form
- Step 11 page wrapper
- Step 12 base i18n keys
- Smoke base flow

Refer to `crud-page/steps.md` for those steps unchanged.
