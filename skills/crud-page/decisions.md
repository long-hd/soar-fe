# Decision Tree: Which Features to Build

Given the extraction artifact from `be-extraction.md`, decide which UI features the CRUD page should include + which variants to use. Output drives the file templates in `steps.md`.

This doc is **decision-table-heavy** — organized by UI element, each with explicit branches.

---

## Quick reference

| UI element                     | Include if                                                    | Skip if                                          |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------ |
| Bulk delete column + button    | `endpoints.deleteList` exists                                 | absent                                           |
| Status switch column           | `endpoints.updateStatus` exists AND entity has `status` field | either missing → render as read-only `<DictTag>` |
| Reset password modal + button  | `endpoints.updatePassword` exists                             | absent                                           |
| Self-protection enforcement    | `features.selfProtection: true` (entity user-like)            | other entities                                   |
| Sortable table columns         | `dtos.PageReqDTO.extends: SortablePageParam`                  | extends only `PageParam`                         |
| `createTime DESC` initial sort | Sortable AND DTO has `createTime` field                       | otherwise → no initial sort                      |
| Refresh button                 | always                                                        | n/a                                              |
| Hide-search toggle             | always                                                        | n/a                                              |
| Form modal Create section      | `endpoints.create` exists                                     | absent (read-only page)                          |
| Form modal Edit section        | `endpoints.update` exists                                     | absent                                           |
| Password field in form         | `dtos.SaveReqDTO` has `password` field                        | absent                                           |
| Single delete button           | `endpoints.delete` exists                                     | absent (rare)                                    |

---

## Quick variant gates

Before building, detect if this is a **standard flat CRUD** or a **variant**:

### Tree-structured entity (PARTIAL match)

Indicators in extraction artifact:

- `dtos.RespDTO` has `parentId` or `pid` field referring to same entity
- `dtos.SaveReqDTO` has matching parent reference
- Controller has `/list` (returns flat list, not paged) instead of (or in addition to) `/page`
- Often missing: `/page` endpoint, sort metadata

**Action**: This skill applies PARTIALLY:

- Types, API client, permissions, modals — covered as normal
- Table component — replace `<Table>` + `usePagedQuery` with `<Tree>` or recursive table
- Bulk delete — typically skipped for trees
- Self-protection — typically not applicable (trees aren't user-like)
- Search form — simplified (often just name search)

Flag to human: "Tree entity detected. Base skill covers ~60%. Tree-specific layout needs human design or separate skill."

### Linked entity (CHILD of another entity)

Indicators:

- `dtos.PageReqDTO` has a required FK field (e.g., `dictType` in dict-data, `roleId` in role-permission)
- Page only meaningful when filtered by the parent's id

**Action**: Same as standard CRUD but:

- The FK comes from URL query param or parent page context, not search form
- Toolbar may have a "Back to parent" link
- Otherwise build as flat CRUD with the FK injected at query level

### Workflow / custom endpoints

Indicators:

- Endpoints not in standard set: `/approve`, `/reject`, `/import`, `/export-excel`, `/assign`, etc.
- DTOs include workflow state machines (`status` field with > 2 dict values)

**Action**: Base skill covers standard CRUD portion. Custom endpoints → flag for human design.

If extraction artifact has 1-2 custom endpoints AND they're simple (e.g., `/approve` toggles a flag), agent CAN include them as action buttons. Anything more complex → human.

### Read-only page

Indicators:

- No `/create`, `/update`, `/delete` endpoints (only `/page` + `/get`)

**Action**: Build list page only. Skip all modals + action column (or only "View Details" button if useful).

---

## Table column decisions

### Which fields appear as columns

Heuristic: identifier + 4-6 most informative biz fields + status + audit + actions. ~7-9 columns total.

**Always include**:

- The primary identifier (`username`, `code`, `name`, `title`, etc.) — sortable
- Status (if dict-typed) — Switch column if updateStatus exists, else DictTag column
- `createTime` (sortable, default DESC sort)
- Actions (last column, width 240-280)

**Include if present + informative**:

- Display name fields (`nickname`, `displayName`)
- Joined FK names (`deptName`, `roleName`) — BE provides these to avoid FE lookup
- Phone-like (`mobile`, `email` — but only one of email/mobile usually)

**Exclude from default table**:

- `id` (rare to display)
- `avatar` (icon, not data — could appear inline next to name if avatar UX desired)
- Long text fields (`remark`, `description`) — show on hover or in detail
- Audit fields beyond createTime (`updateTime`, `creator`, `updater`) — defer to detail
- `loginIp`, `loginDate` (user-specific audit, low value in row)
- Internal flags (`deleted`, `tenantId`)

**For column count > 7**: agent reduces by:

1. Drop email if mobile present (or vice versa) — pick the more business-relevant
2. Drop secondary display field if primary identifier is descriptive enough
3. Truncate long fields with antd `ellipsis: true` + tooltip

### Sort columns

For each column where `sorter: true` should be set:

| Field                               | Sort?                                         |
| ----------------------------------- | --------------------------------------------- |
| Primary identifier (username, code) | YES                                           |
| createTime                          | YES (with `defaultSortOrder: 'descend'`)      |
| Status (dict)                       | NO — sorts by underlying number, useless      |
| FK joined names (deptName)          | NO — BE may not support sort by joined column |
| Long text                           | NO                                            |
| All others                          | NO unless explicit business need              |

If `dtos.PageReqDTO.extends: PageParam` (not Sortable), set NO sort on any column regardless.

### Status column variant

| Conditions                                                              | Render                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| `updateStatus` endpoint + `status` field + user has `update` permission | `<Switch>` inline, calls `updateStatus.mutate` |
| `updateStatus` endpoint + user lacks `update` perm                      | `<DictTag>` (read-only)                        |
| No `updateStatus` endpoint                                              | `<DictTag>` (read-only)                        |
| No `status` field                                                       | column absent                                  |

Switch column uses `<HasPermission code={USER_PERMISSIONS.update} fallback={<DictTag>}>` to wrap, giving graceful degradation when perm absent at runtime.

---

## Action column decisions

### Which action buttons appear

Standard set, in this order:

1. **Edit** — if `update` permission exists
2. **Delete** — if `delete` permission exists
3. **Reset Password** — if `updatePassword` permission exists
4. **Custom workflow buttons** — for any non-standard endpoint included (rare)

If user lacks ALL action permissions for a row → action column hidden (returns `null`).

Wrap each button in `<HasPermission code={...}>` — buttons individually permission-gated.

### Self-protection in action column

If `selfProtection: true`:

- **Edit** — REMAIN enabled (user editing own profile is valid)
- **Delete** — `disabled={isSelf(record)}`
- **Reset Password** — REMAIN enabled (user resetting own password is valid)

Toolbar "Delete N selected" — also gated via `getCheckboxProps` so user can't select own row.

### Action column width

Heuristic: `width: 80 * actionCount + 60` (rough — buttons + padding):

- 3 actions → 240
- 4 actions → 320
- 2 actions → 200
- 1 action → 140

If overflow, antd auto-wraps within Space. Use `Space size="small"` for tighter spacing.

---

## Toolbar decisions

### Layout structure

Two `<Space>` groups split by `justifyContent: 'space-between'`:

- **Left** (primary actions):
  - Create button (if `create` perm)
  - Bulk Delete button (if `deleteList` endpoint + `delete` perm)
  - Custom workflow buttons (if any)

- **Right** (utility actions, always):
  - Hide/Show search toggle (icon button)
  - Refresh (icon button)

### Bulk delete button

Conditions to render:

- `endpoints.deleteList` exists
- User has `delete` permission

If both:

```tsx
<Button
  danger
  disabled={selectedRowKeys.length === 0 || removeMany.isPending}
  onClick={handleDeleteBulk}
>
  {t('systemUser.actions.deleteSelected', { count: selectedRowKeys.length })}
</Button>
```

Pair with checkbox column in Table (rowSelection enabled). Both must exist together — checkboxes without bulk button is confusing; bulk button without checkboxes impossible to use.

### Custom workflow buttons in toolbar

E.g., "Export to Excel", "Bulk Approve". If extraction artifact includes such endpoints + Long approves inclusion, add to left group. Default behavior: agent flags these for human review, doesn't auto-include.

---

## Search form decisions

### Which fields

Source: `dtos.PageReqDTO.fields` from extraction artifact.

Apply Step 8 from `be-extraction.md`:

| BE field type                       | Search input                                   |
| ----------------------------------- | ---------------------------------------------- |
| Identifier string (LIKE search)     | `<Input>` with placeholder                     |
| Dict-typed number                   | `<DictSelect>`                                 |
| FK to dept                          | `<DeptTreeSelect>`                             |
| FK to post                          | `<PostSelect>` (single mode for search)        |
| `Instant[]` range with `@Size(2,2)` | `<DatePicker.RangePicker>`                     |
| `LocalDate[]` range                 | `<DatePicker.RangePicker>` (no time)           |
| Other FK (e.g., roleId)             | inline `<Select>` fetching from `/simple-list` |

### Field ordering

Importance priority (left-to-right, top-to-bottom on wrap):

1. Primary identifier search (username, code)
2. Secondary text (mobile, email)
3. Status filter
4. Key FK (deptId, roleId)
5. Date range (typically rightmost — takes more horizontal space)

Antd `<Form layout="inline">` auto-wraps on narrow screen. Rightmost fields go to next row first.

### When to omit search form entirely

- PageReqDTO has only pagination + sort fields (no filter fields) → no search form. Render `<UserSearchForm>` becomes optional in this case.
- Read-only page where no filtering is useful (rare)

---

## Form modal decisions

### Field inclusion

Source: `dtos.SaveReqDTO.fields`.

**Include all** SaveReqDTO fields **except**:

- `id` (managed by mode: create=undefined, edit=user's id)

**Conditional inclusion**:

- `password` field → render ONLY in create mode (BE ignores in update)

**Hide / disable** in edit mode:

- Username (or whichever immutable identifier) — disabled, displays value

### Field ordering in form

Heuristic priority (top-to-bottom):

1. Primary identifier (username, code, name)
2. Password (create mode only)
3. Display name (nickname, title)
4. Status (if a creation-time field; usually not — set by default)
5. Key FK (deptId, postIds)
6. Contact (email, mobile)
7. Demographics (sex, age)
8. Optional descriptors
9. Long text (remark) — full width, last

### Layout

- `<Form layout="vertical">` — always. (Per T2.3 lesson — horizontal truncates labels.)
- 2 columns via `<Row gutter={16}>` + `<Col span={12}>` for paired short fields
- `<Col span={24}>` for `<Input.TextArea>` (remark, description)
- `<Col span={24}>` for fields needing visual prominence (e.g., a long FK with complex picker UI)

Pair fields by semantic grouping when possible:

- username | password
- nickname | sex
- deptId | postIds
- email | mobile

If field count odd → last field alone on a Col span=12, OR promote to Col span=24 if it benefits from width (e.g., a long multi-select).

### Modal width

| Field count                | Width                                                   |
| -------------------------- | ------------------------------------------------------- |
| ≤ 4 simple fields          | 480                                                     |
| 5-10 fields (typical CRUD) | 600                                                     |
| 11-15 fields               | 720                                                     |
| > 15 fields                | consider splitting into tabs or wizard — flag for human |

For reset password modal (always 2 fields): 420.

### Mode detection

Caller (page) passes `userId` (or `<entity>Id`) prop:

- `userId` undefined → Create mode. Empty form. Password field visible + required.
- `userId` set → Edit mode. Fetch fresh via `use<Entity>DetailQuery(userId)`. Show Spin while loading. Populate via `setFieldsValue` once loaded. Password field absent.

### Detail fetch on edit

ALWAYS use `useUserDetailQuery` / `use<Entity>DetailQuery` on edit (Q T2.3.1=A from Task 2). Don't pass row data into modal — it may be stale or missing fields.

### Dirty-check on close

ALWAYS implement:

```tsx
const handleCancel = () => {
  if (!form.isFieldsTouched()) {
    onClose()
    return
  }
  appModal.confirm({
    title: t('systemUser.modal.discardChanges'),
    okText: t('systemUser.modal.discardConfirm'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    onOk: () => onClose(),
  })
}
```

Bind to `Modal.onCancel`. Default works for X / ESC / mask-click / Cancel button.

### Submit pattern

```tsx
const handleSubmit = async () => {
  const values = await form.validateFields()
  // ...DictSelect tax conversions if needed...
  const dto: SaveReqDTO = { ... }
  if (isEdit) {
    await update.mutateAsync({ ...dto, id: userId })
  } else {
    await create.mutateAsync(dto)
  }
  onClose()
}
```

Bind to `Modal.onOk`. No try/catch — interceptor toasts errors; modal stays open on throw.

---

## Reset password modal decisions

### Should it exist

YES iff:

- `endpoints.updatePassword` in extraction artifact
- User has `update-password` permission (gate button at row level)

If endpoint absent → no modal, no button.

### Form fields

Always 2 fields:

- `newPassword` — required, `min: 4, max: 20` (or match BE constraint)
- `confirmPassword` — required, must match newPassword

Confirm validator MUST use `dependencies={['newPassword']}` (per Task 2 lesson):

```tsx
<Form.Item
  name="confirmPassword"
  dependencies={['newPassword']}
  rules={[
    { required: true, ... },
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
        return Promise.reject(new Error(t('...mismatch')))
      },
    }),
  ]}
>
```

### Modal props

- Width: 420
- Title: `t('...resetPassword.title', { username: user.username })` — show target username
- `destroyOnClose: true`
- `maskClosable: false`
- Receive `user: <Entity>RespDTO | null` prop (not just id — need username for title)
- No detail fetch (no useQuery) — title only needs row data

### Submit

```tsx
const handleSubmit = async () => {
  const values = await form.validateFields()
  if (!user) return
  await updatePassword.mutateAsync({ id: user.id, password: values.newPassword })
  onClose()
}
```

Don't invalidate list query — password isn't a visible column.

---

## Self-protection decisions

If `features.selfProtection: false` → skip this section entirely. No `isSelf` helper needed.

If `features.selfProtection: true`:

### 4 enforcement points

```tsx
const currentUser = useAppSelector(selectUser)
const isSelf = (record: RespDTO) => record.id === currentUser?.id
```

Apply at:

1. **Status Switch** column: `disabled={isSelf(record) || updateStatus.isPending}`
2. **Delete** action button: `disabled={isSelf(record)}`
3. **Checkbox** in rowSelection: `getCheckboxProps: record => ({ disabled: isSelf(record) })`
4. **Edit + Reset Password** — REMAIN enabled (intentional; user manages own profile)

### Don't block Bulk Delete entirely

User may select OTHER rows (not own). Bulk Delete button availability depends on `selectedRowKeys.length > 0`. Self can't be selected due to point 3 → never appears in `selectedRowKeys`. Safe.

---

## Initial sort decisions

| Condition                                                  | INITIAL_SORT                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| Sortable + has `createTime` field                          | `{ field: 'createTime', order: 'desc' }`                     |
| Sortable + has `updateTime` field but no createTime        | `{ field: 'updateTime', order: 'desc' }`                     |
| Sortable + has another timestamp-like field (`recordedAt`) | use that, DESC                                               |
| Sortable + no timestamp field                              | `{ field: 'id', order: 'desc' }` (newest by insert order)    |
| Not sortable                                               | omit `INITIAL_SORT` constant; `useTableState({}, undefined)` |

Also set matching `defaultSortOrder: 'descend'` on the corresponding column header so antd visual matches state.

---

## i18n key generation rules

Auto-generate keys based on extraction artifact + this naming convention.

### Per-domain JSON file

Filename: `<module>-<entity>.json` (kebab-case).

Top-level key: `<module><Entity>` (camelCase, matches `<module>-<entity>` → `systemUser`, `systemRole`).

### Key structure

```json
{
  "<module><Entity>": {
    "page": { "title": "<Entity> Management" },
    "table": { "<fieldName>": "<Field Label>", ... },
    "search": { "<fieldName>": "<Field Label>", ... },
    "actions": {
      "create": "Create",
      "edit": "Edit",
      "delete": "Delete",
      "resetPassword": "Reset Password",
      "deleteSelected": "Delete {{count}} selected"
    },
    "confirm": {
      "deleteOne": "Delete <entity> \"{{name}}\"?",
      "deleteMany": "Delete {{count}} <entity>s?"
    },
    "messages": {
      "createSuccess": "<Entity> created",
      "updateSuccess": "<Entity> updated",
      "deleteSuccess": "<Entity> deleted",
      "deleteBulkSuccess": "{{count}} <entity>s deleted",
      "statusUpdateSuccess": "Status updated",
      "resetPasswordSuccess": "Password reset"
    },
    "form": {
      "<fieldName>": "<Field Label>",
      "<fieldName>Placeholder": "...",
      "<fieldName>Required": "Please enter <field>",
      "<fieldName>Length": "<Field> must be A-B characters"
    },
    "modal": {
      "createTitle": "Create <Entity>",
      "editTitle": "Edit <Entity>",
      "discardChanges": "Discard unsaved changes?",
      "discardConfirm": "Discard",
      "loading": "Loading..."
    },
    "resetPassword": { ... if reset password feature included ... }
  }
}
```

### Skipped sections

- `messages.statusUpdateSuccess` → omit if no status toggle
- `messages.deleteBulkSuccess` → omit if no bulk delete
- `messages.resetPasswordSuccess` → omit if no reset password
- `resetPassword` block → omit if no reset password
- `actions.deleteSelected`, `actions.resetPassword` → omit corresponding
- `confirm.deleteMany` → omit if no bulk delete

### Vietnamese mirror

Same structure with Vietnamese strings. Translation guidance:

- Action labels: "Create" → "Tạo mới", "Edit" → "Sửa", "Delete" → "Xóa"
- Status updates: "X updated" → "Đã cập nhật X"
- Confirms: "Delete X?" → "Xóa X?"
- Validators: "Required" → "Vui lòng nhập", "Must be A-B chars" → "Phải có A-B ký tự"

Agent generates initial VN translations from EN; human translator reviews.

### Field label derivation

If `@Schema(description=...)` exists on BE field → use description.

Else derive from camelCase name:

- `username` → "Username" / "Tên đăng nhập"
- `deptId` → "Department" / "Phòng ban" (drop `Id` suffix, use FK semantic)
- `createTime` → "Created At" / "Ngày tạo"
- `loginIp` → "Login IP" / "IP đăng nhập" (preserve acronyms uppercase)

Agent should match existing labels in `_example/system-user.json` for parallel fields (e.g., a `nickname` field in a different entity uses same label).

---

## Permission constants

Generate `<ENTITY>_PERMISSIONS` const from extraction artifact's `permissions` map:

```ts
export const <ENTITY>_PERMISSIONS = {
  query:          '<module>:<entity>:query',
  create:         '<module>:<entity>:create',
  update:         '<module>:<entity>:update',
  delete:         '<module>:<entity>:delete',
  updatePassword: '<module>:<entity>:update-password',  // omit if no endpoint
} as const
```

Use these throughout the page in `<HasPermission code={X.create}>` wrappers.

---

## Default values + omissions summary

When extraction artifact lacks a feature, the page **omits** the corresponding UI element rather than including-and-hiding. Reasons:

- Smaller bundle / less code
- Less template-noise for agent reviewers
- No "feature mysteriously broken" scenarios (user sees button, expects function, BE returns 404)

Always include (Phase 5B convention):

- Toolbar refresh + hide-search buttons
- Pagination
- Loading state via tableProps.loading
- Permission gating on every action

Always omit if not applicable:

- Status switch column (no status field OR no updateStatus)
- Reset password (no updatePassword)
- Bulk delete (no deleteList)
- Self-protection (non-user entity)
- Sort indicators (no SortablePageParam)

---

## Output handoff

Pass these decisions (in working memory) to `steps.md`. That doc has 9 build steps with templates; for each step, this doc says **which optional code blocks to keep or drop**.

---

## Worked example: User entity

Given User extraction artifact (from `be-extraction.md` worked example), decisions resolve as:

- Bulk delete: YES (deleteList endpoint exists)
- Status switch column: YES (updateStatus exists + status field present)
- Reset password modal: YES (updatePassword exists)
- Self-protection: YES (entity is User)
- Sortable columns: YES (SortablePageParam)
- Initial sort: createTime DESC
- Form fields: username, password (create only), nickname, sex, deptId, postIds, email, mobile, remark
- Form layout: vertical, 2-column for 8 paired fields, full-width for remark
- Modal width: 600 (9 fields, mid-range)
- Search fields: username, mobile, status, deptId, createTime range
- Permissions: query, create, update, delete, updatePassword (5 codes)
- i18n namespace: `systemUser` (file `system-user.json`)

Now `steps.md` builds files using these decisions to fill templates.
