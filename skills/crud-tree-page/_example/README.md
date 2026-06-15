# crud-tree-page / \_example

Canonical reference implementation: **`src/features/system/dept/`** (TD block).

This skill's tree pattern was extracted after TD and TM both passed (Rule of Two). The dept feature is the canonical reference — read its files directly instead of copying into this folder.

## Files to read (in order)

1. `src/features/system/dept/types.ts` — DTOs + Filters + TreeNode alias
2. `src/features/system/dept/constants.ts` — Permissions + dict types
3. `src/features/system/dept/api/index.ts` — 6 endpoints with `list` (not page)
4. `src/features/system/dept/hooks/index.ts` — Query keys, `useDeptFullListQuery`, mutations with dual invalidation
5. `src/features/system/dept/components/dept-search-form.tsx` — 2-field filter
6. `src/features/system/dept/components/dept-form-modal.tsx` — 3 useEffects, disabledIds, race guard
7. `src/features/system/dept/pages/dept-list-page.tsx` — Tree memo, expandedRowKeys, action column
8. `src/pages/system/dept/index.tsx` — Page wrapper
9. `src/shared/components/dept-tree-select.tsx` — Foundation: shared tree picker with disabledIds
10. `src/shared/hooks/use-dept-tree.ts` — Foundation: tree hook
11. `src/shared/api/lookup/dept.ts` — Foundation: simple-list api
12. `src/shared/lib/tree.ts` — Foundation: buildTreeFromFlat, collectAncestorIds, collectDescendantIds
13. `src/shared/i18n/locales/en/system-dept.json` — i18n keys

## When dept's pattern doesn't fit

For variants beyond standard tree, consult `src/features/system/menu/` (TM block):

- **Conditional form by type discriminator** — `menu/components/menu-form-modal.tsx` `<Form.Item shouldUpdate>` pattern
- **Type-filtered parent picker** — `src/shared/components/menu-tree-select.tsx` `filterButtonNodes` recursion
- **Auth-slice refresh on mutation** — `menu/hooks/index.ts` `bootstrapAuth` dispatch
- **Modal width dynamic per type** — `menu/components/menu-form-modal.tsx` `Form.useWatch`

These TM-specific patterns are **variant** (1 instance only). See `decisions.md` Q9 + Q10. Codify into a separate skill once 2nd instance surfaces.

## Why no copied sanitized files

The `crud-page/_example/` folder was created when user-list-page was the FIRST flat CRUD instance — no canonical source existed in `src/features/`. By the time `crud-tree-page` was extracted, both `dept/` and `menu/` were canonical instances. Reading them directly avoids drift between skill `_example/` and live code.
