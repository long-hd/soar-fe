# Skill: crud-tree-page

> Build a tree-shaped admin CRUD page (parent_id self-FK, flat `/list` → client-side tree, expandable Table).
> Extends `skills/crud-page/` — read that first for flat CRUD foundations. This skill documents the **tree variant deltas** only.

---

## When to use

Trigger this skill when BE entity matches ALL of:

1. **Self-referencing FK**: PO has `parent_id` (or `parentId`) column referencing same table
2. **Flat list endpoint**: Controller exposes `/list` returning `List<RespDTO>` (NOT paginated `/page`)
3. **Delete guard**: Service throws `{ENTITY}_EXISTS_CHILDREN` (or similar) when deleting node with children
4. **Sort field** inside data (not pagination sort — display order within siblings)
5. **Hierarchical display intent**: Admin needs to see relationships visually

Examples:

- `system/dept` (validated TD)
- `system/menu` (validated TM)
- Future candidates: org-units, category trees, file-system-like entities

Anti-pattern: tag-cloud or M2M-related entities where parent_id doesn't form a clean tree — use `crud-page/` instead.

---

## How this extends crud-page/

| Aspect                | flat CRUD (`crud-page/`)     | tree variant (this skill)                                     |
| --------------------- | ---------------------------- | ------------------------------------------------------------- |
| List endpoint         | `/page` paginated            | `/list` flat array                                            |
| Query hook            | `usePagedQuery`              | `useQuery` direct                                             |
| Pagination            | enabled, with sort           | `pagination={false}`                                          |
| Table display         | `<Table>` rows               | `<Table>` with `expandable + childrenColumnName`              |
| Search behavior       | filter via PageReqDTO        | filter via BE filters → tree rebuild + auto-expand            |
| Delete guard          | usually none (leaf entities) | **pre-check via `record.children?.length`**                   |
| Parent picker         | N/A                          | shared `<{Entity}TreeSelect>` with `disabledIds`              |
| Edit-mode disabledIds | N/A                          | `[currentId, ...descendantIds]` — prevents cycle              |
| Modal full-list query | uses page data               | **separate `use{Entity}FullListQuery`** for unfiltered tree   |
| Tree builder          | N/A                          | `buildTreeFromFlat` from `shared/lib/tree.ts`                 |
| Expand keys           | N/A                          | `defaultExpandAllRows` or controlled via `collectAncestorIds` |

Everything ELSE inherits from `crud-page/`:

- File organization per feature (same folder structure)
- Form modal lifecycle (reset → populate → preset, `open` in deps)
- DictSelect tax for status field
- App.useApp() for message + modal
- HasPermission gating
- Mutations no-callback (ADR 0005)
- i18n EN/VI parallel structure
- Imports order, icons (Iconify only), antd v6 syntax (`mask={{ closable: false }}`)

---

## Recipe order

Read these in order:

1. **`README.md`** (you are here) — when to use, scope
2. **`decisions.md`** — 10 tree-specific design decisions with rationale
3. **`steps.md`** — step-by-step build (extends `crud-page/steps.md`)
4. **`_example/`** — sanitized reference from `system/dept` (canonical instance)

For BE extraction, use `crud-page/be-extraction.md` PLUS the tree-specific section "Identifying a tree variant" added to `decisions.md` Q0.

---

## Validated instances

| Block | Entity        | Notes                                                                                                            |
| ----- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| TD    | `system/dept` | First instance. Foundation `<DeptTreeSelect>` + `tree.ts` helpers added.                                         |
| TM    | `system/menu` | Second instance. Foundation `<MenuTreeSelect>` + `useMenuTree`. **First conditional form** (type discriminator). |

Patterns stable across both → this skill extracted (Rule of Two).

---

## Variants observed (within tree)

| Variant                               | Trigger                                                                    | Where covered                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Standard tree CRUD**                | parent_id + /list + delete guard                                           | `steps.md` main flow                                                             |
| **Conditional form by discriminator** | Entity has `type` field with per-type field requirements (DIR/MENU/BUTTON) | `decisions.md` Q9 + variant note (only TM so far — observe before full template) |
| **Auth-slice refresh after mutation** | Editing entity affects current admin's UI (sider menus)                    | `decisions.md` Q10 (only TM so far — observe)                                    |
| **Type-filtered parent picker**       | Some types cannot be parent (e.g., BUTTON in TM)                           | `decisions.md` Q5                                                                |

---

## Foundation cascading

Building first instance of tree variant adds (or extends) shared infra. Subsequent instances reuse:

| Foundation                                                                                       | Added by | Reused by       | Now reusable for           |
| ------------------------------------------------------------------------------------------------ | -------- | --------------- | -------------------------- |
| `shared/lib/tree.ts` helpers (`buildTreeFromFlat`, `collectAncestorIds`, `collectDescendantIds`) | TD       | TM              | any tree feature           |
| `<DeptTreeSelect>` with `disabledIds`                                                            | A3 + TD  | dept admin edit | any user of dept hierarchy |
| `<MenuTreeSelect>` with `disabledIds` + type filter                                              | TM       | menu admin edit | any user of menu hierarchy |
| Pattern: `use{Entity}FullListQuery` (unfiltered separate key)                                    | TD       | TM              | any tree variant           |
| Pattern: race guard (`disabled` + `loading` on parent picker during fullListQuery load)          | TD       | TM              | any tree variant           |

When extracting future tree skill in `_example/`, reference these as already-present.

---

## Anti-patterns

Don't:

- Use antd `<Tree>` component for main list view (no row actions UI)
- Recursive client-side tree building per render (use `useMemo`)
- Pre-fetch full unfiltered list eagerly — lazy via modal's `enabled: open && isEdit`
- Show button-type or other non-parent-eligible nodes in parent picker AS DISABLED (filter them OUT)
- Forget self+descendants exclusion on parent picker in edit mode (causes cycle)
- Share query key between page filtered list AND modal full list (use separate keys to avoid option collision)
- Add `/page` endpoint to tree variant — by definition uses `/list`
- Add server-side column sort — sort is data field, not query param
- Add pagination — tree uses `pagination={false}`

---

## Output guarantee

A tree CRUD page built per this skill is:

- Type-safe end-to-end
- Self-prevents cycles (disabledIds in edit mode)
- Race-safe (parent picker locked during fullListQuery load)
- Idempotent on mutation (dual cache invalidation when foundation lookup exists)
- Visually expanded by default (`defaultExpandAllRows`)
- Filterable with auto-expand to matched nodes
- Delete-guarded at FE (pre-check) and BE (error fallback)
- i18n parallel EN/VI
