# Example: `system/user` CRUD Reference

> Concrete, working code from `features/system/user/`. **Don't copy verbatim** — use as pattern reference. Agent reading `steps.md` finds template skeletons; this folder shows what filled templates look like.

This is the **canonical reference** for the CRUD skill. When `steps.md` says "see \_example/...", look here.

---

## File index

| File                            | Source in repo                                                  | Role                                   | Lines |
| ------------------------------- | --------------------------------------------------------------- | -------------------------------------- | ----- |
| `types.ts`                      | `features/system/user/types.ts`                                 | TS DTOs + filters + page req params    | 111   |
| `api.ts`                        | `features/system/user/api/index.ts`                             | HTTP client methods                    | 69    |
| `constants.ts`                  | `features/system/user/constants.ts`                             | Permissions + dict types + enum values | 47    |
| `hooks-index.ts`                | `features/system/user/hooks/index.ts`                           | Query keys + queries + mutations       | 86    |
| `user-search-form.tsx`          | `features/system/user/components/user-search-form.tsx`          | Inline search form, 5 fields           | 106   |
| `user-form-modal.tsx`           | `features/system/user/components/user-form-modal.tsx`           | Create + edit unified modal            | 248   |
| `user-reset-password-modal.tsx` | `features/system/user/components/user-reset-password-modal.tsx` | Reset password 2-field modal           | 127   |
| `user-list-page.tsx`            | `features/system/user/pages/user-list-page.tsx`                 | Orchestrating page component           | 252   |
| `page-wrapper.tsx`              | `src/pages/system/user/index.tsx`                               | Thin wrapper for `import.meta.glob`    | 5     |
| `system-user.en.json`           | `src/shared/i18n/locales/en/system-user.json`                   | English i18n keys                      | 80    |
| `system-user.vi.json`           | `src/shared/i18n/locales/vi/system-user.json`                   | Vietnamese i18n keys                   | 80    |

Total: ~1211 lines of working production code (as of T2.5 ship).

---

## Naming convention reminder

Files prefixed with `user-` represent the entity-specific naming convention. When adapting for a different entity (e.g., Role):

| Example file (User)             | Target file (Role)            |
| ------------------------------- | ----------------------------- |
| `user-search-form.tsx`          | `role-search-form.tsx`        |
| `user-form-modal.tsx`           | `role-form-modal.tsx`         |
| `user-reset-password-modal.tsx` | (omit — Role has no password) |
| `user-list-page.tsx`            | `role-list-page.tsx`          |
| `system-user.en.json`           | `system-role.en.json`         |

Type names + constants similarly transform:

- `UserRespDTO` → `RoleRespDTO`
- `USER_PERMISSIONS` → `ROLE_PERMISSIONS`
- `sysUserQueryKey` → `sysRoleQueryKey`
- `useUserMutations` → `useRoleMutations`

Folder structure files preserve their original names (`types.ts`, `api/index.ts`, etc.) — those are role-agnostic.

Page wrapper file (`page-wrapper.tsx` in this folder) is actually named `index.tsx` in real repo at `src/pages/<module>/<entity-kebab>/index.tsx`. Renamed here for clarity in this flat reference folder.

---

## Reading order for first-time learners

If you're new to this codebase or want to understand the pattern from scratch, read in this order:

1. **`types.ts`** — establishes the data shapes. Easiest entry point.
2. **`constants.ts`** — permission codes + enum mirrors. Trivial but referenced everywhere.
3. **`api.ts`** — see the Phase 5A unwrap pattern: `.then(r => r.data.data)` at end of each method.
4. **`hooks-index.ts`** — collected mutations pattern, no callbacks in hook (ADR 0005).
5. **`user-search-form.tsx`** — DictSelect tax in action (form value type vs DTO type).
6. **`user-list-page.tsx`** — composition heavyweight: useTableState + usePagedQuery + 3 mutations + columns + toolbar.
7. **`user-form-modal.tsx`** — unified create/edit, conditional password, dirty-check gate, DictSelect tax on both load + submit.
8. **`user-reset-password-modal.tsx`** — minimal modal, `dependencies={['newPassword']}` validator.
9. **`page-wrapper.tsx`** — 5 lines, just re-exports default.
10. **`system-user.en.json` + `.vi.json`** — i18n structure mirror.

For agent doing build: follow steps.md order (different sequence).

---

## Patterns highlighted

These patterns are explained in `decisions.md` and `steps.md` — here you see them concretely:

### DictSelect tax (ADR 0004)

- `user-search-form.tsx`: form value `status?: string`, converted to `number` at `handleFinish`.
- `user-form-modal.tsx`: form value `sex?: string`, converted to `number` at `handleSubmit`. On load via `setFieldsValue`, number → String conversion.

### Mutations chain (ADR 0005)

- `hooks-index.ts`: mutations only do toast + invalidate.
- `user-form-modal.tsx`: caller chains `await create.mutateAsync(dto); onClose()`.
- `user-list-page.tsx` (`handleDeleteBulk`): `await removeMany.mutateAsync(ids); setSelectedRowKeys([])`.

### Self-protection 4 places (decisions.md)

In `user-list-page.tsx`:

1. Status switch: `disabled={isSelf(record) || updateStatus.isPending}`
2. Delete button: `disabled={isSelf(record)}`
3. Checkbox: `getCheckboxProps: record => ({ disabled: isSelf(record) })`
4. Edit + Reset Password: REMAIN enabled

### Conditional password field

`user-form-modal.tsx`:

```tsx
{!isEdit && (
  <Col span={12}>
    <Form.Item name="password" ...>
      <Input.Password ... />
    </Form.Item>
  </Col>
)}
```

Field entirely absent in edit mode — `form.validateFields()` won't trigger required rule.

### Dirty-check gate (decisions.md)

Both modals:

```tsx
const handleCancel = () => {
  if (!form.isFieldsTouched()) { onClose(); return }
  appModal.confirm({ ... })
}
```

`setFieldsValue` doesn't mark touched → opening edit + closing without typing → silent close.

### Vertical form layout

Both modals use `<Form layout="vertical">`. Labels above inputs. Set after Task 2 horizontal-layout truncation issue (T2.3).

### `dependencies` cross-field validator

`user-reset-password-modal.tsx`:

```tsx
<Form.Item
  name="confirmPassword"
  dependencies={['newPassword']}
  rules={[
    { required: true, ... },
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
        return Promise.reject(new Error(...))
      },
    }),
  ]}
>
```

Without `dependencies`, changing newPassword AFTER both filled doesn't re-validate confirm.

### useUserMutations called in 3 places

`user-list-page.tsx`, `user-form-modal.tsx`, `user-reset-password-modal.tsx` each call `useUserMutations()` independently. Each consumer owns its own mutation pending state. React Query convention — mutations don't cache.

### Animated hide-search toggle (T2.5)

`user-list-page.tsx`:

```tsx
<div style={{
  overflow: 'hidden',
  transition: 'max-height 300ms ease, ...',
  maxHeight: searchVisible ? 600 : 0,
  opacity: searchVisible ? 1 : 0,
  marginBottom: searchVisible ? 16 : 0,
}}>
  <UserSearchForm ... />
</div>
```

CSS transition — component stays mounted, state preserved across toggles.

### Toolbar split layout

```tsx
<Space style={{ justifyContent: 'space-between', width: '100%' }}>
  <Space>{/* primary actions */}</Space>
  <Space>{/* utility actions */}</Space>
</Space>
```

Outer Space horizontal with split; inner Spaces group buttons.

---

## What this example does NOT cover

If your target entity needs any of the below, this example is insufficient + you need additional design:

- **Tree-structured entities** (dept, menu) — no tree picker, no recursive rendering shown here
- **File upload fields** (avatar, attachments) — no shared upload component referenced
- **Multi-step wizard forms** — single modal only
- **Custom workflow actions** (approve, reject) — only standard CRUD action column
- **Linked-entity master-detail** (dict-type selector affecting dict-data list) — single-entity page only
- **Server-pushed updates** (WebSocket, polling beyond TanStack default) — none of that here

For these, see additional skills (TBD) or hand off to human for ad-hoc design.

---

## Status + maintenance

- **Snapshot date**: 2026-06-13
- **Snapshot source**: `features/system/user/` at Task 2 closing (T2.5)
- **Validated against**: smoke test T2-S1..T2-S20 (passed)

If `features/system/user/` is significantly refactored in the future, this `_example/` folder is now stale. Decide:

1. **Update**: re-copy from current state, sanitize, update snapshot date
2. **Re-anchor**: pick a different reference entity (e.g., `system/role` once stable) and rebuild `_example/` from there

Don't let `_example/` drift silently — agents trust it. A stale example teaches wrong patterns.

---

## Quick reference: where to find what

| Looking for...                            | Open                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| How to type DTOs                          | `types.ts`                                                                     |
| How to wire API methods                   | `api.ts`                                                                       |
| Permission code naming                    | `constants.ts`                                                                 |
| Mutation collected hook pattern           | `hooks-index.ts`                                                               |
| DictSelect string-boundary conversion     | `user-search-form.tsx` lines 30-45, `user-form-modal.tsx` lines 50-65 + 95-110 |
| Self-protection 4 enforcement points      | `user-list-page.tsx` lines 150-200                                             |
| Form modal conditional password           | `user-form-modal.tsx` lines 130-155                                            |
| Confirm password match validator          | `user-reset-password-modal.tsx` lines 75-95                                    |
| Table column with permission-gated Switch | `user-list-page.tsx` lines 165-185                                             |
| Toolbar split layout (primary + utility)  | `user-list-page.tsx` lines 215-245                                             |
| Animated hide-search container            | `user-list-page.tsx` lines 200-215                                             |
| i18n key namespace structure              | `system-user.en.json`                                                          |

Line numbers approximate; actual files may have shifted by minor edits.
