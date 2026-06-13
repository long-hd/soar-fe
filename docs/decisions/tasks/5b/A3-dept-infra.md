# A3 — Dept Infrastructure

> Single block. Builds dept fetch + tree-build util + `<DeptTreeSelect>` for reuse across all CRUD pages. Pattern mirrors A2.

---

## BE confirmed

- `GET /admin-api/system/dept/simple-list` (alias `/list-all-simple`) — exists, any authenticated user
- Returns `CommonResult<DeptSimpleRespDTO[]>` where each entry:

```typescript
{
  id: number
  name: string
  parentId: number // 0 = root (yudao convention)
}
```

BE returns flat list. FE builds tree by `parentId`.

---

## Scope

5 files (1 patch + 4 new):

1. `src/shared/lib/tree.ts` — NEW — generic `buildTreeFromFlat<T>()` util
2. `src/shared/api/lookup/dept.ts` — NEW — fetch fn + types
3. `src/shared/hooks/use-dept-tree.ts` — NEW — hooks + `prefetchDeptTree()`
4. `src/shared/components/dept-tree-select.tsx` — NEW — antd TreeSelect wrapper
5. `src/layouts/app-shell.tsx` — PATCH — call `prefetchDeptTree` in existing effect

---

## 1. `src/shared/lib/tree.ts` (new file)

```typescript
/**
 * Generic flat-list → tree builder.
 *
 * Used by:
 *  - dept (A3) — Hierarchical organization
 *  - menu admin (port loop) — Menu items have parentId
 *  - Future: region, area, category, any hierarchical entity
 *
 * Yudao reference: `src/utils/tree.ts > handleTree()`. Same idea, more type-safe API.
 *
 * Root detection rule:
 *  - parentId is null/undefined → root
 *  - parentId refers to an item NOT in the list → root (defensive: orphans become roots)
 *  - parentId === 0 → typically becomes "orphan → root" since no item has id=0
 *    (matches yudao convention without needing a special-case param)
 *  - parentId refers to a known item → child of that item
 *
 * Items are SHALLOW-CLONED before adding `children` to avoid mutating the input array.
 * Sort order within each level is preserved from the input.
 */

export type TreeNode<T> = T & { children?: TreeNode<T>[] }

export interface BuildTreeOptions<T> {
  getId: (item: T) => string | number
  getParentId: (item: T) => string | number | null | undefined
}

export function buildTreeFromFlat<T>(
  items: readonly T[],
  options: BuildTreeOptions<T>,
): TreeNode<T>[] {
  const { getId, getParentId } = options

  // First pass: shallow-clone each item, index by id.
  const map = new Map<string | number, TreeNode<T>>()
  for (const item of items) {
    map.set(getId(item), { ...item } as TreeNode<T>)
  }

  // Second pass: attach to parent or push as root.
  const roots: TreeNode<T>[] = []
  for (const item of items) {
    const node = map.get(getId(item))!
    const parentId = getParentId(item)

    if (parentId == null) {
      roots.push(node)
      continue
    }

    const parent = map.get(parentId)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(node)
    } else {
      // Orphan (parentId not in map) or root (parentId === 0 with no id=0 in data).
      roots.push(node)
    }
  }

  return roots
}
```

---

## 2. `src/shared/api/lookup/dept.ts` (new file)

```typescript
import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * BE source: DeptController.getSimpleDeptList — returns ENABLE depts only (server-filtered).
 */

export interface DeptSimpleDTO {
  id: number
  name: string
  parentId: number // 0 = root
}

const URL = '/admin-api/system/dept/simple-list'

export async function fetchDeptList(): Promise<DeptSimpleDTO[]> {
  const res = await request.get<CommonResult<DeptSimpleDTO[]>>(URL)
  return res.data.data
}
```

---

## 3. `src/shared/hooks/use-dept-tree.ts` (new file)

```typescript
import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchDeptList, type DeptSimpleDTO } from '@/shared/api/lookup/dept'
import { buildTreeFromFlat, type TreeNode } from '@/shared/lib/tree'

/**
 * Dept lookup hooks. Same eager-prefetch + in-memory-cache strategy as dict (A2).
 *
 * - `prefetchDeptTree` called once from AppShell mount.
 * - Tree shape built once in `useDeptTree`, memoized against the underlying data
 *   array reference — only rebuilds when dept data changes (e.g., after dept
 *   admin mutation invalidates the cache).
 * - `useDeptList` for raw flat list (when tree shape unnecessary).
 * - `useDeptName(id)` for read-only label lookup — symmetric to `useDictLabel`.
 *
 * Yudao reference: dept fetched eagerly in dept admin page + dept select component.
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
```

---

## 4. `src/shared/components/dept-tree-select.tsx` (new file)

```tsx
import { TreeSelect, type TreeSelectProps } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { useMemo } from 'react'
import { useDeptTree } from '@/shared/hooks/use-dept-tree'
import type { DeptSimpleDTO } from '@/shared/api/lookup/dept'
import type { TreeNode } from '@/shared/lib/tree'

/**
 * antd TreeSelect pre-filled with the dept tree.
 *
 * Forwards all standard TreeSelect props (value, onChange, allowClear, multiple,
 * placeholder, etc.). Works inside antd Form.Item without extra wiring:
 *
 *   <Form.Item name="deptId" label="Department">
 *     <DeptTreeSelect allowClear placeholder="Select dept" />
 *   </Form.Item>
 *
 * Sensible defaults applied (overridable):
 *  - `showSearch` enabled
 *  - `treeNodeFilterProp="title"` — typing filters by dept name
 *  - `treeDefaultExpandAll` — expand all by default (dept trees are typically shallow)
 *
 * Value type: numeric dept id (BE Long → JS number). Single value by default.
 * Pass `multiple` prop for multi-select where it makes sense (e.g., data-permission
 * "user can access these depts").
 */

interface DeptTreeSelectProps extends Omit<TreeSelectProps, 'treeData' | 'loading'> {}

function toTreeData(items: TreeNode<DeptSimpleDTO>[]): DefaultOptionType[] {
  return items.map(item => ({
    title: item.name,
    value: item.id,
    children: item.children?.length ? toTreeData(item.children) : undefined,
  }))
}

export function DeptTreeSelect(props: DeptTreeSelectProps) {
  const { data: tree, isLoading } = useDeptTree()
  const treeData = useMemo(() => toTreeData(tree), [tree])

  return (
    <TreeSelect
      showSearch
      treeNodeFilterProp="title"
      treeDefaultExpandAll
      {...props}
      treeData={treeData}
      loading={isLoading}
    />
  )
}
```

> Note: `{...props}` after the defaults means caller can override (e.g., `treeDefaultExpandAll={false}` for very deep trees).

---

## 5. `src/layouts/app-shell.tsx` (patch)

Append `prefetchDeptTree` call to the existing prefetch effect from A2.

**Find** (added in A2):

```tsx
import { prefetchDictData } from '@/shared/hooks/use-dict-data'
```

**Add next to it**:

```tsx
import { prefetchDeptTree } from '@/shared/hooks/use-dept-tree'
```

**Find** (the prefetch effect from A2):

```tsx
useEffect(() => {
  prefetchDictData(queryClient)
}, [queryClient])
```

**Replace with**:

```tsx
useEffect(() => {
  prefetchDictData(queryClient)
  prefetchDeptTree(queryClient)
}, [queryClient])
```

A4 will append `prefetchPostList(queryClient)` to this same block.

---

## Notes on subtle points

### Why a separate `useDeptList` alongside `useDeptTree`

Some consumers want flat list (e.g., a `<Select>` of all depts without tree shape, or `useDeptName` lookup). Tree-shaped data forces consumers into recursion when they don't need it. Two hooks, one underlying query — zero extra cost.

### Why the tree util is generic instead of dept-specific

Will be reused for menu admin (port loop) and any future hierarchical entity. AGENTS.md rule: "if it's cross-feature, it goes in shared". This util qualifies. Yudao codifies the same with `handleTree`.

### Why shallow-clone in `buildTreeFromFlat`

Without clone, attaching `children` mutates the input items. TanStack Query stores the original array — mutation corrupts the cached data, causing stale data on next read. Shallow clone (1 level) is enough because we only add `children` at the top level; nested objects are shared by reference (acceptable since dept items have no nested mutable fields).

### `treeNodeFilterProp="title"` as default

antd TreeSelect's default `treeNodeFilterProp` is `'value'`, which means typing "1" filters for items with `value=1` — useless for users searching by name. Setting `"title"` makes search-by-name work out of the box. Overridable if a use case ever needs value-based filtering.

### Dept admin CRUD will invalidate

Same as dict. After mutation:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { DEPT_QUERY_KEY } from '@/shared/hooks/use-dept-tree'

const qc = useQueryClient()
// after successful create/update/delete:
qc.invalidateQueries({ queryKey: DEPT_QUERY_KEY })
```

Will codify in the dept admin page (port loop).

---

## Smoke test

Inline in welcome screen. Add test block, revert after.

```tsx
import { DeptTreeSelect } from '@/shared/components/dept-tree-select'
import { useDeptTree, useDeptName } from '@/shared/hooks/use-dept-tree'

// Inside welcome render:
function DeptSmoke() {
  const { data: tree, isLoading } = useDeptTree()
  const rootName = useDeptName(tree[0]?.id ?? null)
  return (
    <div style={{ padding: 24 }}>
      <p>
        Loading: {String(isLoading)}, Root count: {tree.length}, First root: {rootName ?? '-'}
      </p>
      <p>Tree raw:</p>
      <pre style={{ fontSize: 12 }}>{JSON.stringify(tree, null, 2)}</pre>
      <p>DeptTreeSelect:</p>
      <DeptTreeSelect allowClear placeholder="Select dept" style={{ width: 300 }} />
    </div>
  )
}
// then <DeptSmoke /> in the welcome JSX
```

| #    | Step                                                                                                                                                                                                                                                      | Expected                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A3-1 | Login. DevTools Network. AppShell mounts.                                                                                                                                                                                                                 | 1 call to `/dept/simple-list` fires alongside `/dict-data/simple-list` (both from AppShell prefetch effect). |
| A3-2 | Navigate to welcome (with test block above).                                                                                                                                                                                                              | Root count > 0. Tree JSON shows nested `children`. DeptTreeSelect opens with hierarchy.                      |
| A3-3 | Type into DeptTreeSelect dropdown.                                                                                                                                                                                                                        | Filtering works by name (typing "test" filters for depts containing "test").                                 |
| A3-4 | Switch tabs, return.                                                                                                                                                                                                                                      | No extra calls. Cache hit.                                                                                   |
| A3-5 | F5.                                                                                                                                                                                                                                                       | Fresh fetch on AppShell remount.                                                                             |
| A3-6 | Pick a dept, deselect.                                                                                                                                                                                                                                    | onChange fires with id (number) then null.                                                                   |
| A3-7 | Verify shallow-clone defensiveness: in DevTools console run `JSON.stringify(useQueryClient().getQueryData(['system','dept','all']))` and check that NO entries have a `children` field (tree is built in `useDeptTree`, the cached flat list stays flat). | No `children` field in cached data.                                                                          |

After verifying, remove test block.

---

## Apply checklist

- [ ] Create `src/shared/lib/tree.ts`.
- [ ] Create `src/shared/api/lookup/dept.ts`.
- [ ] Create `src/shared/hooks/use-dept-tree.ts`.
- [ ] Create `src/shared/components/dept-tree-select.tsx`.
- [ ] Patch `src/layouts/app-shell.tsx` — add import + add prefetchDeptTree to existing effect.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm lint` passes.
- [ ] Inject test block in welcome → smoke A3-1..A3-7 → revert.

---

## Tech debt opened by A3

| #      | Item                                                                                                                                                                                                            | Defer until                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A3-TD1 | No sessionStorage persistence (same as A2-TD1 — handled by the same future migration).                                                                                                                          | Together with A2-TD1.                                                                              |
| A3-TD2 | Tree util doesn't preserve a stable identity for unchanged subtrees. Every rebuild creates new node objects. Acceptable for current scale (dozens of depts); revisit if a tree with thousands of nodes appears. | When perf becomes an issue.                                                                        |
| A3-TD3 | `<DeptTreeSelect>` doesn't support "disable this branch" semantics (e.g., when editing a dept, you should not be able to set its own descendant as its parent).                                                 | When dept admin edit page lands (port loop) — add `disabledIds` prop with subtree exclusion logic. |

---

**End A3. Awaiting confirmation before A4 (Post infra — last lookup module before A5 table hooks).**
