# crud-tree-page — Design Decisions

> 10 tree-variant decisions with vote rationale. Extends `crud-page/decisions.md` — only deltas documented here.

---

## Q0 — Identifying a tree variant (BE-side gate)

Before applying this skill, verify BE entity is a true tree variant:

**Required signals**:

- [ ] PO column `parent_id BIGINT` (or `parentId` field) self-FK to same table
- [ ] Controller has `/list` endpoint returning `List<{Entity}RespDTO>` (NOT `/page`)
- [ ] Service `delete()` throws `{ENTITY}_EXISTS_CHILDREN` error code when children exist
- [ ] Resp DTO has `parentId` field (mirrors PO)
- [ ] Resp DTO does NOT have a `children` field (tree is FE-derived)

**Optional signals**:

- [ ] Service has `@CacheEvict(value = "{ENTITY}_CHILDREN_ID_LIST", allEntries = true)` on mutations
- [ ] Simple list endpoint `/simple-list` (`/list-all-simple`) for parent picker dropdowns
- [ ] Constants like `PARENT_ID_ROOT = 0L` (BE convention: 0 = root)

If signals match → apply this skill. If only some match → entity is hybrid; consult `crud-page/` decisions for non-tree parts.

---

## Q1 — Display: Table or Tree component?

|              |                                                                   |                                                                                        |
| ------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **A (vote)** | antd `<Table>` with `expandable + childrenColumnName: 'children'` | Supports per-row action buttons, columns (Sort, Status, Actions); admin pattern parity |
| B            | antd `<Tree>` component                                           | Cleaner pure-tree but no per-row actions; force everything into custom render          |
| C            | Two-pane master-detail                                            | Wider screen needed; unconventional for admin                                          |

Vote A. Indentation is automatic via expandable rows.

---

## Q2 — Initial expand state

|              |                                             |                                                                |
| ------------ | ------------------------------------------- | -------------------------------------------------------------- |
| **A (vote)** | `defaultExpandAllRows: true` (uncontrolled) | Best for small-medium orgs (<200 nodes); admin scans full tree |
| B            | Collapse all, root visible only             | Cluttered compact view; extra clicks                           |
| C            | Expand root + 1 level                       | Compromise; more state complexity                              |

Vote A. If tree size > 200 nodes becomes UX issue, revisit (mark as TD entry).

**Implementation**: `expandable={{ defaultExpandAllRows: true }}` when no filters. When filters active, switch to controlled `expandedRowKeys` per Q3.

---

## Q3 — Search behavior

|              |                                                                                            |                                              |
| ------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **A (vote)** | BE filter (`/list?name=&status=`) → tree rebuild → auto-expand to matched nodes' ancestors | Yudao parity; works even when matches sparse |
| B            | Local filter on cached tree, highlight matches                                             | Faster repeated search; complex UI           |
| C            | Local filter, hide non-matches, show flat list                                             | Loses tree context                           |

Vote A. **Implementation**:

- Page state: `filters: { ...filters }`
- Active flag: `hasActiveFilters = filters.name != null || filters.status != null`
- Expanded keys when active: `collectAncestorIds(flatList.map(d => d.id), id => parentIdById.get(id))`
- Expanded keys when no filters: `undefined` → uncontrolled `defaultExpandAllRows`

**Caveat**: BE `/list?name=X` returns only matching rows — NOT ancestor closure. If matched node's parent is filtered out, node appears as root in rebuilt tree. Acceptable behavior; auto-expand only applies within returned dataset.

---

## Q4 — Delete guard UX

|              |                                                                                                             |                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **A (vote)** | Pre-check via `record.children?.length > 0` → disable Delete button + tooltip "Cannot delete: has children" | Cheap (tree query already loaded); cleaner UX than click-then-error |
| B            | Click → BE rejects with `{ENTITY}_EXISTS_CHILDREN` → toast                                                  | Less code; rougher UX                                               |

Vote A. For bulk delete: `rowSelection.getCheckboxProps: r => ({ disabled: hasChildren(r) })`.

BE error is fallback for race conditions (admin delete while another adds child).

---

## Q5 — Parent picker shared component

Foundation expansion: shared `<{Entity}TreeSelect>` component.

|              |                                                                                       |                                                                              |
| ------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **A (vote)** | Add shared `<{Entity}TreeSelect>` in `src/shared/components/` with `disabledIds` prop | Reusable across forms (admin edit, user-entity assignment, future workflows) |
| B            | Feature-local component                                                               | Not reusable; foundation gap                                                 |

Vote A. Required props:

```typescript
type Props = Omit<TreeSelectProps, 'treeData' | 'loading'> & {
  disabledIds?: number[]
  loading?: boolean // override prop for race guard
}
```

**Type-filtered parent picker** (variant — TM-specific):

Some entities have types where certain types cannot be parent (e.g., BUTTON menu can't have children). Add type filter:

```typescript
function filterIneligibleNodes(items) {
  return items
    .filter(item => item.type !== INELIGIBLE_TYPE)
    .map(item => ({
      ...item,
      children: item.children?.length ? filterIneligibleNodes(item.children) : undefined,
    }))
}
```

Filter BEFORE `toTreeData` (not via `disabled` prop). BUTTON nodes hidden entirely from picker.

---

## Q6 — Edit-mode `disabledIds` computation

In edit mode, prevent setting self or descendants as parent (would create cycle).

|              |                                                                                  |                                                    |
| ------------ | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| **A (vote)** | `disabledIds = [currentId, ...collectDescendantIds(fullTree, currentId, getId)]` | Clean; uses tree helpers from `shared/lib/tree.ts` |
| B            | BE rejects cycle, no FE check                                                    | Ugly UX (user can pick, then submit fails)         |

Vote A. Implementation in form modal:

```typescript
const disabledIds = useMemo(() => {
  if (!isEdit || id == null || fullFlatList.length === 0) return undefined
  const fullTree = buildTreeFromFlat(fullFlatList, { getId, getParentId })
  return [id, ...collectDescendantIds(fullTree, id, getId)]
}, [isEdit, id, fullFlatList])
```

---

## Q7 — Unfiltered full list query for modal

Modal needs unfiltered tree to compute descendants (Q6) AND to validate uniqueness fields (e.g., `tabKey` in menu).

**Problem**: Page may have active filters → page query data is filtered subset → modal can't compute descendants correctly.

|              |                                                                   |                                                               |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| A            | Modal uses page's filtered data                                   | **Incomplete** — descendants outside filter scope missing     |
| **B (vote)** | Modal owns separate `use{Entity}FullListQuery` with dedicated key | Correct + lazy (`enabled: open && isEdit` or `enabled: open`) |
| C            | Always disable page filters when modal open                       | Bad UX                                                        |

Vote B.

**Key separation**: dedicated `fullList` key — DON'T reuse `list({})` because React Query merges options across consumers (first wins), causing modal's `staleTime` to be ignored.

```typescript
// hooks/index.ts
sysEntityQueryKey = {
  all: ['system', 'entity'],
  detail: (id) => [...all, 'detail', id],
  list: (filters) => [...all, 'list', filters],
  fullList: [...all, 'full-list'],  // ← separate key
}

useEntityFullListQuery({ enabled }) {
  return useQuery({
    queryKey: sysEntityQueryKey.fullList,
    queryFn: () => entityApi.list({}),
    enabled: enabled ?? true,
    staleTime: 60_000,
  })
}
```

Invalidation: page mutation invalidates prefix `['system', 'entity']` → catches both `list` and `fullList` keys.

---

## Q8 — Race guard during parent picker load

When modal opens in edit mode, `useEntityFullListQuery` starts fetching. Before resolution, `disabledIds === undefined` → user could pick self/descendant briefly.

|              |                                                                                      |                           |
| ------------ | ------------------------------------------------------------------------------------ | ------------------------- |
| **A (vote)** | Pass `disabled + loading` to `<{Entity}TreeSelect>` during `fullListQuery.isLoading` | Sub-second lock; clean UX |
| B            | Accept race; BE rejects cycle                                                        | Ugly recovery             |

Vote A.

```typescript
const parentPickerLocked = isEdit && fullListQuery.isLoading

<EntityTreeSelect
  disabledIds={disabledIds}
  disabled={parentPickerLocked}
  loading={parentPickerLocked}
/>
```

`<{Entity}TreeSelect>` must accept `loading` override prop:

```typescript
loading={isLoading || !!loadingOverride}
```

---

## Q9 — Conditional form variant (when type discriminator drives fields)

**Trigger**: entity has `type` field where field requirements differ per type value.

Validated only in TM (1 instance) — Rule of Two not satisfied. Document as variant note, not full template.

|                             |                                                                                                                                      |                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| **A (vote when triggered)** | Single FormValues with all optional fields + `<Form.Item shouldUpdate={(prev, curr) => prev.type !== curr.type}>` reactive rendering | antd idiomatic; clean re-render scope |
| B                           | 3 separate sub-forms in conditional render                                                                                           | Verbose; prop drilling                |

Implementation when applied:

1. **Single FormValues type** with always-required fields + all type-specific fields as optional:

```typescript
interface FormValues {
  name: string
  type: number
  parentId?: number
  sort: number
  status: string
  // type-specific (all optional in TS, conditionally required by validator):
  icon?: string
  path?: string
  tabKey?: string
  component?: string
  permission?: string
}
```

2. **`<Form.Item shouldUpdate>` wraps conditional sections**:

```tsx
<Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
  {({ getFieldValue }) => {
    const type = getFieldValue('type') as number
    if (type === TYPE_A) return <TypeAFields />
    if (type === TYPE_B) return <TypeBFields />
    return null
  }}
</Form.Item>
```

3. **Modal width dynamic per type** via `Form.useWatch('type', form)`:

```typescript
const type = Form.useWatch('type', form)
const modalWidth = type === TYPE_B ? 720 : type === TYPE_C ? 480 : 600
```

4. **Submit builder strips fields by type**:

```typescript
function buildDto(values: FormValues): SaveReqDTO {
  const base = { name, type, parentId, sort, status }
  if (type === TYPE_A) return { ...base, icon, path, visible }
  if (type === TYPE_B) return { ...base, tabKey, component }
  // etc — irrelevant fields NOT included
}
```

5. **Type field disabled on edit** (parity with `code` immutability pattern across crud-page):

```tsx
<TypeSelect disabled={isEdit} />
```

6. **Per-type validation** via `getFieldValue('type')` inside validator callbacks or dynamic rules in `shouldUpdate` render.

Codify as full skill folder if 2nd instance surfaces.

---

## Q10 — Auth-slice refresh after mutation (variant)

**Trigger**: editing entity changes admin's own UI (e.g., menu admin changes their sider menus).

Validated only in TM (1 instance). Document as variant.

|                             |                                                                                                    |                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **A (vote when triggered)** | After mutation success → `dispatch(bootstrapAuth())` to refetch user + roles + permissions + menus | Sider refreshes immediately, admin sees changes |
| B                           | Manual page reload required                                                                        | Bad UX                                          |
| C                           | Selective `setMenus` action with menu-only refetch endpoint                                        | BE work; not exposed currently                  |

Implementation:

```typescript
function useEntityMutations() {
  const dispatch = useAppDispatch()
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_KEY })
    queryClient.invalidateQueries({ queryKey: LOOKUP_KEY })
  }
  const onSuccess = msgKey => {
    message.success(t(msgKey))
    invalidateAll()
    void dispatch(bootstrapAuth()) // ← non-awaiting; sub-second stale window acceptable
  }
  // ...
}
```

Codify if 2nd instance surfaces (e.g., role mutation affects current admin's permissions).

---

## Q11 — Dual cache invalidation (foundation lookup)

If entity has foundation lookup (e.g., `useDeptTree`, `useMenuTree`, `useDictTypeSimpleList`), admin mutations MUST invalidate foundation key too.

Same pattern as `crud-page/` Q on `POST_QUERY_KEY` / `DICT_QUERY_KEY` — applies more critically in tree variants because tree pickers (DeptTreeSelect, MenuTreeSelect) consume foundation cache.

```typescript
const invalidateAll = () => {
  queryClient.invalidateQueries({ queryKey: ADMIN_KEY }) // e.g., ['system', 'dept']
  queryClient.invalidateQueries({ queryKey: LOOKUP_KEY }) // e.g., ['system', 'dept', 'all']
}
```

Both invalidations on every mutation onSuccess.

---

## Features map fields (tree variant)

Tree variants extend `crud-page/`'s features map with:

```yaml
tree: true
listEndpoint: '/list'                        # NOT /page
deleteGuard: 'hasChildren'                   # FE pre-check + BE error fallback
foundationCacheKey: {ENTITY}_QUERY_KEY       # if foundation lookup exists
typeFilterParent: <type_value> | null        # if parent picker excludes some types
conditionalForm: 'type-discriminator' | null # if Q9 applies
authRefreshOnMutation: 'bootstrapAuth' | null # if Q10 applies
```

---

## Decision summary table

| Q   | Decision                                     | Always apply?                            |
| --- | -------------------------------------------- | ---------------------------------------- |
| Q0  | Verify BE tree signals                       | Always (gate)                            |
| Q1  | Table expandable (not Tree component)        | Always                                   |
| Q2  | `defaultExpandAllRows: true`                 | Always (small/medium trees)              |
| Q3  | BE filter + auto-expand to matched ancestors | Always                                   |
| Q4  | Pre-check delete guard at FE                 | Always                                   |
| Q5  | Shared `<{Entity}TreeSelect>` foundation     | Always (Rule of Two: extract on 2nd use) |
| Q6  | Edit-mode disabledIds (self + descendants)   | Always                                   |
| Q7  | Separate `useFullListQuery` for modal        | Always                                   |
| Q8  | Race guard on picker load                    | Always                                   |
| Q9  | Conditional form variant                     | Only if entity has type discriminator    |
| Q10 | bootstrapAuth refresh                        | Only if mutation affects admin UI        |
| Q11 | Dual cache invalidation                      | Always (if foundation lookup exists)     |
