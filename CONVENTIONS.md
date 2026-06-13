# CONVENTIONS.md — Soar Frontend

> Detailed coding standards for soar-fe. Referenced by AGENTS.md.

---

## Style Note: yudao (Vue) vs Soar (React)

yudao frontend (`yudao-ui-admin-vue3`) uses Vue3 + Element Plus. Soar uses React 19.2 + Ant Design v6. Patterns are conceptually parallel; code is rewritten, not translated.

| Aspect           | yudao FE                                   | Soar FE                                                        |
| ---------------- | ------------------------------------------ | -------------------------------------------------------------- |
| File naming      | `UserList.vue` (PascalCase)                | `user-list-page.tsx` (kebab-case)                              |
| Component naming | PascalCase                                 | PascalCase                                                     |
| Type suffix      | `*VO`                                      | `*DTO`                                                         |
| UI framework     | Element Plus                               | Ant Design v6                                                  |
| Forms            | Element Plus el-form                       | antd Form                                                      |
| Form validation  | el-form rules + async-validator            | antd Form rules                                                |
| Schema lib       | none (form rules inline)                   | **none baseline** — zod added per-feature only                 |
| Server state     | Pinia + manual fetch                       | TanStack Query v5                                              |
| Client state     | Pinia                                      | Redux Toolkit + redux-persist                                  |
| Routing          | Vue Router (path-based + addRoute dynamic) | react-router-dom (thin) + flat URL `?tab=<tab_key>` dispatcher |
| Keep-alive       | `<keep-alive include>`                     | React 19.2 `<Activity>`                                        |
| Icons            | Iconify (via `<Icon icon="ep:tools"/>`)    | Iconify (via `@iconify/react`)                                 |
| Date             | dayjs                                      | dayjs                                                          |
| i18n             | vue-i18n                                   | react-i18next                                                  |
| HTTP             | axios                                      | axios (instance named `request`)                               |

---

## Naming Conventions

| Type                 | Convention                                 | Example                                                                                                                               |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Component file       | kebab-case                                 | `user-list-page.tsx`, `user-form-modal.tsx`                                                                                           |
| Component name       | PascalCase (in code)                       | `export function UserListPage()`                                                                                                      |
| Hook file            | kebab-case with `use-` prefix              | `use-permission.ts`, `use-paged-query.ts`                                                                                             |
| Hook name            | camelCase with `use` prefix                | `usePermission()`, `usePagedQuery()`                                                                                                  |
| Utility file         | kebab-case                                 | `format.ts`, `permission-matcher.ts`                                                                                                  |
| Type/Interface       | PascalCase + DTO suffix for BE-mirrored    | `UserRespDTO`, `UserSaveReqDTO`, `PageResult<T>`                                                                                      |
| Constant             | UPPER_SNAKE_CASE                           | `API_BASE_URL`, `DEFAULT_PAGE_SIZE`, `USER_PERMISSIONS`                                                                               |
| Redux slice file     | kebab-case with `-slice` suffix            | `auth-slice.ts` → export `authSlice`                                                                                                  |
| API function         | camelCase verb on api object               | `userApi.page()`, `userApi.create()`                                                                                                  |
| Query key            | object with `.all` + `.detail(id)` factory | `sysUserQueryKey.all`, `sysUserQueryKey.detail(id)`                                                                                   |
| i18n key             | dot-separated, camelCase namespace         | `systemUser.form.username`, `common.cancel`                                                                                           |
| CSS classes          | antd built-in + design tokens              | Tailwind v4 utilities for layout (`flex`, `p-4`, `gap-2`); antd tokens for theme-aware colors; no custom CSS unless absolutely needed |
| `tab_key` (BE field) | kebab-case `<module>-<entity>[-<action>]`  | `system-user`, `system-user-detail`, `infra-job-log`                                                                                  |

## File Organization per Feature

Current canonical structure (post-Task 2):

```
features/system/user/
├── api/
│   └── index.ts                  # userApi: page, get, create, update, delete, ...
├── components/
│   ├── user-form-modal.tsx       # Create/edit modal (unified, mode by id prop)
│   ├── user-reset-password-modal.tsx
│   └── user-search-form.tsx      # Filter bar above table
├── constants.ts                  # USER_PERMISSIONS, USER_DICT_TYPES, enum mirrors
├── hooks/
│   └── index.ts                  # sysUserQueryKey, useUserDetailQuery, useUserMutations
├── pages/
│   └── user-list-page.tsx        # Orchestrating page component
└── types.ts                      # UserRespDTO, UserSaveReqDTO, UserFilters, ...
```

**Folder roles**:

- `api/` — single file `index.ts` per feature. Multiple files only when a feature genuinely spans multiple entities (rare).
- `components/` — sub-pieces composed by the page (modals, forms, columns). NOT the orchestrating component.
- `pages/` — the orchestrating page component (one per top-level entity). Separated from `components/` to make composition direction explicit (page imports components, never reverse).
- `hooks/` — query keys + queries + collected mutations. See TanStack Query Pattern.
- `constants.ts` — permission codes, dict-type names, enum value mirrors. Flat file.
- `types.ts` — flat file. Subfolder `types/<X>-types.ts` only when single file exceeds ~200 lines OR feature spans multiple entities.

**No `index.ts` barrel** at feature root — pages import from explicit paths (`@/features/system/user/pages/user-list-page`). Barrels add maintenance cost for little gain.

**Page wrapper at `src/pages/<module>/<entity>/index.tsx`** — thin re-export consumed by `import.meta.glob` dispatcher (TabRenderer). Matches BE `system_menu.component` value.

## Comment Conventions

Language: **English only** for all comments.

### What to comment

**Component JSDoc** — Top of each component file:

```tsx
/**
 * User management list page.
 * Displays paginated user table with search filters and CRUD actions.
 * Actions are permission-gated via <HasPermission>.
 */
export function UserListPage() {
```

**Hook JSDoc**:

```tsx
/**
 * Checks if the current user has a given permission code.
 * Super admin wildcard `*:*:*` returns true for any check.
 *
 * @returns hasPermission(code: string): boolean
 */
export function usePermission() {
```

**"Why" comments** — Explain non-obvious logic:

```tsx
// Invalidate all queries under sysUserQueryKey.all (not just list) because
// updating a user may affect role mapping, dept tree, and the active session.
queryClient.invalidateQueries({ queryKey: sysUserQueryKey.all })

// 5 minute staleTime — combined with <Activity> keep-alive, gives a near-instant
// experience when switching tabs without refetching.
const { data } = useQuery({ queryKey: [...], queryFn, staleTime: 5 * 60_000 })
```

**Type field comments** — Non-obvious fields:

```typescript
interface MenuDTO {
  id: number
  type: number // 1=Directory, 2=Page, 3=Button
  tabKey: string | null // URL dispatcher key; null for type=1 and type=3
  component: string | null // FE file path for glob loader; null for type=1 and type=3
  keepAlive: boolean // Wrap in <Activity> when rendered as tab
}
```

### What NOT to comment

```tsx
// ❌ Restating the JSX
// Render the user table
return <Table ... />

// ❌ Trivial state
const [open, setOpen] = useState(false)  // dialog open state

// ❌ Commented-out code — delete it
// <OldComponent />

// ❌ Chinese / Vietnamese comments. English only.
// 用户列表  <-- delete this
```

---

## TypeScript Conventions

```typescript
// API response types — mirror backend DTOs (suffix DTO)
interface UserRespDTO {
  id: number
  username: string
  nickname: string
  email?: string
  mobile?: string
  status: number // dict 'common_status'
  sex?: number // dict 'user_sex'
  deptId?: number
  deptName?: string // BE-joined
  postIds?: number[]
  remark?: string
  createTime: string // Instant — formatted on render via formatDateTime
}

// Unified save DTO — single shape for create + update.
// Matches BE @AssertTrue isPasswordValid which discriminates on id == null.
interface UserSaveReqDTO {
  id?: number // undefined = create, set = update
  username: string
  password?: string // required on create, ignored on update
  nickname: string
  email?: string
  mobile?: string
  sex?: number
  deptId?: number
  postIds?: number[]
  remark?: string
}

// Side endpoints — when separate request shape needed
interface UserUpdateStatusReqDTO {
  id: number
  status: number
}

interface UserUpdatePasswordReqDTO {
  id: number
  password: string
}

// Search filters (form↔URL state, fed to PageReqParams)
interface UserFilters extends Record<string, unknown> {
  username?: string
  mobile?: string
  status?: number
  deptId?: number
  createTime?: [string, string] // ISO range
}

// Page request shape (composes Filters + pagination + sort)
type UserPageReqParams = {
  pageNo: number
  pageSize: number
  sortingFields?: SortParams[]
} & UserFilters

// Shared types in shared/api/types.ts
interface PageResult<T> {
  list: T[]
  total: number
}
interface PageParam {
  pageNo: number
  pageSize: number
}
interface CommonResult<T> {
  code: number
  data: T
  msg: string
}
```

## API Call Pattern

```typescript
// File: features/system/user/api/index.ts
import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type {
  UserPageReqParams,
  UserRespDTO,
  UserSaveReqDTO,
  UserUpdatePasswordReqDTO,
  UserUpdateStatusReqDTO,
} from '../types'

const BASE = '/admin-api/system/user'

export const userApi = {
  page(params: UserPageReqParams): Promise<PageResult<UserRespDTO>> {
    return request
      .get<CommonResult<PageResult<UserRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<UserRespDTO> {
    return request
      .get<CommonResult<UserRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: UserSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: UserSaveReqDTO): Promise<boolean> {
    return request.put<CommonResult<boolean>>(`${BASE}/update`, data).then(r => r.data.data)
  },

  delete(id: number): Promise<boolean> {
    return request
      .delete<CommonResult<boolean>>(`${BASE}/delete`, { params: { id } })
      .then(r => r.data.data)
  },

  deleteList(ids: number[]): Promise<boolean> {
    return request
      .delete<CommonResult<boolean>>(`${BASE}/delete-list`, { params: { ids } })
      .then(r => r.data.data)
  },

  updateStatus(data: UserUpdateStatusReqDTO): Promise<boolean> {
    return request.put<CommonResult<boolean>>(`${BASE}/update-status`, data).then(r => r.data.data)
  },

  updatePassword(data: UserUpdatePasswordReqDTO): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${BASE}/update-password`, data)
      .then(r => r.data.data)
  },
}
```

Note: `request` is the axios instance from `@/shared/api/http-client`. The response interceptor validates `CommonResult.code` (toasts and rejects on non-zero) but does NOT unwrap — success responses pass through as full `AxiosResponse<CommonResult<T>>`. Each `userApi` method declares its unwrapped return type and performs `.then(r => r.data.data)` as the last expression. This matches yudao convention 1:1 and keeps response shape transparent. See ADR 0002.

## TanStack Query Pattern

Mature stage — query keys + parameterized queries + collected mutations live in `features/<module>/<entity>/hooks/index.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { userApi } from '../api'
import type { UserSaveReqDTO, UserUpdatePasswordReqDTO, UserUpdateStatusReqDTO } from '../types'

export const USER_QUERY_KEY = ['system', 'user'] as const

export const sysUserQueryKey = {
  all: USER_QUERY_KEY,
  detail: (id: number) => [...sysUserQueryKey.all, 'detail', id] as const,
}

export function useUserDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysUserQueryKey.detail(id!),
    queryFn: () => userApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function useUserMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp() // not static `message` from 'antd'
  const queryClient = useQueryClient()

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: sysUserQueryKey.all })

  const create = useMutation({
    mutationFn: (data: UserSaveReqDTO) => userApi.create(data),
    onSuccess: () => {
      message.success(t('systemUser.messages.createSuccess'))
      void invalidateList()
      // NO onClose() — caller chains UI action (see ADR 0005)
    },
  })

  const update = useMutation({
    mutationFn: (data: UserSaveReqDTO) => userApi.update(data),
    onSuccess: () => {
      message.success(t('systemUser.messages.updateSuccess'))
      void invalidateList()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      message.success(t('systemUser.messages.deleteSuccess'))
      void invalidateList()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => userApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('systemUser.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateList()
    },
  })

  const updateStatus = useMutation({
    mutationFn: (vars: UserUpdateStatusReqDTO) => userApi.updateStatus(vars),
    onSuccess: () => {
      message.success(t('systemUser.messages.statusUpdateSuccess'))
      void invalidateList()
    },
  })

  const updatePassword = useMutation({
    mutationFn: (vars: UserUpdatePasswordReqDTO) => userApi.updatePassword(vars),
    onSuccess: () => {
      message.success(t('systemUser.messages.resetPasswordSuccess'))
      // No invalidation — password isn't a visible column
    },
  })

  return { create, update, remove, removeMany, updateStatus, updatePassword }
}
```

Caller chains UI side effect via `await mutateAsync()`:

```tsx
const { create, update } = useUserMutations()

const handleSubmit = async () => {
  const values = await form.validateFields()
  await create.mutateAsync(dto)
  onClose() // UI side effect at caller, NOT in hook
}
```

Errors surface globally via axios interceptor — no per-call `onError` needed by default. If `mutateAsync` throws, `onClose()` doesn't reach → modal stays open → user retries.

**MVP stage** (early development, before extraction) — inline `useMutation` in page is acceptable. Extract to hooks when 3+ consumers need same mutation OR page exceeds ~400 lines OR more than 4 mutations on the same entity.

## Table + Pagination Pattern

```tsx
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Card, Space, Table, Tooltip, type TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'
import type { SortParams } from '@/shared/types/api'

import { userApi } from '../api'
import { USER_PERMISSIONS } from '../constants'
import { sysUserQueryKey, useUserMutations } from '../hooks'
import type { UserFilters, UserRespDTO } from '../types'

const INITIAL_SORT: SortParams = { field: 'createTime', order: 'desc' }

export function UserListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const tableState = useTableState<UserFilters>({}, INITIAL_SORT)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [searchVisible, setSearchVisible] = useState(true)

  const { tableProps, refetch } = usePagedQuery<UserRespDTO, UserFilters>({
    baseQueryKey: sysUserQueryKey.all, // hook extends with query params internally
    queryFn: userApi.page,
    tableState,
  })

  const { remove, removeMany } = useUserMutations()

  const handleDelete = (record: UserRespDTO) => {
    modal.confirm({
      title: t('systemUser.confirm.deleteOne', { name: record.username }),
      okType: 'danger',
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const columns: TableColumnsType<UserRespDTO> = [
    { title: t('systemUser.table.username'), dataIndex: 'username', sorter: true },
    {
      title: t('systemUser.table.status'),
      dataIndex: 'status',
      render: status => <DictTag dictType="common_status" value={status} />,
    },
    {
      title: t('systemUser.table.createTime'),
      dataIndex: 'createTime',
      sorter: true,
      defaultSortOrder: 'descend',
      render: formatDateTime,
    },
    {
      title: t('systemUser.table.actions'),
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={USER_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              {t('systemUser.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={USER_PERMISSIONS.delete}>
            <Button type="link" size="small" danger onClick={() => handleDelete(record)}>
              {t('systemUser.actions.delete')}
            </Button>
          </HasPermission>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      {/* Animated hide-search container */}
      <div
        style={{
          overflow: 'hidden',
          transition: 'max-height 300ms ease, opacity 200ms ease, margin-bottom 300ms ease',
          maxHeight: searchVisible ? 600 : 0,
          opacity: searchVisible ? 1 : 0,
          marginBottom: searchVisible ? 16 : 0,
        }}
      >
        <UserSearchForm
          loading={tableProps.loading}
          onSearch={filters => tableState.setFilters(filters)}
          onReset={() => tableState.clearFilters()}
        />
      </div>

      {/* Toolbar: primary actions left + utility actions right */}
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <HasPermission code={USER_PERMISSIONS.create}>
            <Button type="primary" onClick={openCreate}>
              {t('systemUser.actions.create')}
            </Button>
          </HasPermission>
        </Space>
        <Space>
          <Tooltip title={searchVisible ? t('common.hideSearch') : t('common.showSearch')}>
            <Button icon={<SearchOutlined />} onClick={() => setSearchVisible(v => !v)} />
          </Tooltip>
          <Tooltip title={t('common.refresh')}>
            <Button
              icon={<ReloadOutlined />}
              loading={tableProps.loading}
              onClick={() => refetch()}
            />
          </Tooltip>
        </Space>
      </Space>

      <Table<UserRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
        }}
      />
    </Card>
  )
}
```

Key points:

- `usePagedQuery` takes `baseQueryKey` (hook extends with queryParams internally) + `queryFn` directly (no closure over `tableState`)
- `useTableState<TFilters>(initialFilters, initialSort?)` returns a stateful object with `.setFilters`, `.clearFilters`, etc.
- `Modal.confirm` (via `App.useApp()`) for deletions — not `Popconfirm` (consistent with antd `<App>` wrapper)
- Self-protection (when user-like entity): see Patterns from Task 2 section
- Hide-search animation + refresh button: toolbar utility pattern (T2.5)

## Form + Modal Pattern (antd Form, no RHF)

Unified create + edit modal — single component, mode chosen by `id` prop:

```tsx
import { App, Col, Form, Input, Modal, Row, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { USER_DICT_TYPES } from '../constants'
import { useUserDetailQuery, useUserMutations } from '../hooks'
import type { UserSaveReqDTO } from '../types'

interface UserFormModalProps {
  open: boolean
  /** undefined = create mode, set = edit */
  id?: number
  onClose: () => void
}

// Form values diverge from UserSaveReqDTO for dict-typed fields (string in form, number in DTO).
// See "DictSelect Tax" in Patterns from Task 2.
interface FormValues {
  username: string
  password?: string
  nickname: string
  sex?: string // string in form layer
  deptId?: number
  remark?: string
}

export function UserFormModal({ open, id, onClose }: UserFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = id != null

  const { create, update } = useUserMutations()
  const detailQuery = useUserDetailQuery(id, { enabled: open && isEdit })

  // Populate form on edit. NOTE: convert number → string for dict-typed fields
  useEffect(() => {
    if (!detailQuery.data) return
    const d = detailQuery.data
    form.setFieldsValue({
      username: d.username,
      nickname: d.nickname,
      sex: d.sex == null ? undefined : String(d.sex), // dict-typed: string for Select
      deptId: d.deptId,
      remark: d.remark,
    })
  }, [detailQuery.data, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const dto: UserSaveReqDTO = {
      username: values.username,
      nickname: values.nickname,
      // dict-typed: convert string → number for DTO
      sex: values.sex == null || values.sex === '' ? undefined : Number(values.sex),
      deptId: values.deptId,
      remark: values.remark?.trim() || undefined,
    }
    if (isEdit) {
      await update.mutateAsync({ ...dto, id })
    } else {
      await create.mutateAsync({ ...dto, password: values.password })
    }
    onClose() // UI side effect chained at caller, NOT in mutation hook
  }

  const handleCancel = () => {
    // Dirty-check gate — silent close if form unchanged
    if (!form.isFieldsTouched()) {
      onClose()
      return
    }
    appModal.confirm({
      title: t('systemUser.modal.discardChanges'),
      okText: t('systemUser.modal.discardConfirm'),
      okType: 'danger',
      onOk: () => onClose(),
    })
  }

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemUser.modal.editTitle' : 'systemUser.modal.createTitle')}
      width={600}
      confirmLoading={create.isPending || update.isPending}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      maskClosable={false}
    >
      {isEdit && detailQuery.isLoading ? (
        <Spin />
      ) : (
        <Form form={form} layout="vertical" autoComplete="off">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label={t('systemUser.form.username')}
                rules={[{ required: true }, { min: 4, max: 30 }]}
              >
                <Input disabled={isEdit} />
              </Form.Item>
            </Col>
            {!isEdit && (
              <Col span={12}>
                <Form.Item
                  name="password"
                  label={t('systemUser.form.password')}
                  rules={[{ required: true }, { min: 4, max: 20 }]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nickname"
                label={t('systemUser.form.nickname')}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sex" label={t('systemUser.form.sex')}>
                <DictSelect dictType={USER_DICT_TYPES.sex} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="remark" label={t('systemUser.form.remark')}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}
    </Modal>
  )
}
```

**Notes**:

- Unified `UserSaveReqDTO` for both create + update (matches BE `@AssertTrue isPasswordValid` discriminator on `id == null`). No separate `Create`/`Update` types.
- `Form.useForm()` from antd. No RHF.
- `App.useApp()` for `modal.confirm` and `message.success`. Never static `Modal`/`message` from `'antd'` (see Patterns from Task 2 → antd App API).
- Validation declarative via `rules` on `Form.Item`. No zod.
- **Vertical layout default** — horizontal truncates labels (Phase 5B T2.3 lesson).
- **2-column dense forms**: `<Row gutter={16}>` + `<Col span={12}>` for paired short fields, `<Col span={24}>` for long text (TextArea).
- **DictSelect tax**: form values for dict-typed fields stay string; convert at `setFieldsValue` load + `handleSubmit` boundaries. NOT via `Form.Item normalize` (breaks Select display). See ADR 0004.
- **`dependencies={['otherField']}` required** on cross-field validators (e.g., password confirm matching).
- `form.isFieldsTouched()` gates discard confirm — silent close when user hasn't typed anything.
- `destroyOnHidden` resets internal state per open cycle.
- `maskClosable={false}` — prevent accidental data loss from misclick on overlay.
- BE field-level errors map via `form.setFields([{ name: 'username', errors: ['...'] }])`.

## Permission Usage Pattern

```tsx
// Conditional rendering
import { HasPermission } from '@/features/permission'

<HasPermission code="system:user:create">
  <Button type="primary" onClick={openCreate}>{t('common.create')}</Button>
</HasPermission>

// Optional fallback
<HasPermission
  code="system:user:export"
  fallback={
    <Tooltip title={t('common.noPermission')}>
      <Button disabled>{t('common.export')}</Button>
    </Tooltip>
  }
>
  <Button onClick={doExport}>{t('common.export')}</Button>
</HasPermission>

// Programmatic check
import { usePermission } from '@/features/permission'

const can = usePermission()
if (can('system:user:delete')) { /* ... */ }
```

`HasPermission` and `usePermission` handle the `*:*:*` wildcard automatically — never inline that check yourself.

Use `USER_PERMISSIONS.create` constants from feature `constants.ts` instead of inline `'system:user:create'` strings when possible — typo-safe + grep-discoverable.

## i18n Pattern

```tsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()

// In JSX
<Button>{t('common.save')}</Button>

// Form item label
<Form.Item label={t('systemUser.form.username')} ... />

// With interpolation
<Alert message={t('common.deletedCount', { count: 3 })} />

// In code (toasts, etc.)
const { message } = App.useApp()
message.success(t('common.saved'))
```

**Rule**: every visible string in JSX or in `message.*` / `notification.*` / `modal.confirm` must go through `t()`. Do not hardcode English strings.

**Namespace structure** — per-domain JSON files merged into single `translation` runtime namespace (see ADR 0003):

```
locales/en/
  common.json       → { "common":      { ... } }
  app-shell.json    → { "appShell":    { ... } }
  system-user.json  → { "systemUser":  { ... } }
  system-role.json  → { "systemRole":  { ... } }
```

i18n key structure:

- `common.*` — shared across features (cancel, save, edit, delete, confirm, etc.)
- `<i18nNamespace>.page.title` — page title (e.g., `systemUser.page.title`)
- `<i18nNamespace>.table.<field>` — table column header
- `<i18nNamespace>.search.<field>` — search form label
- `<i18nNamespace>.form.<field>` — form field label
- `<i18nNamespace>.form.<field>Required` — required-rule message
- `<i18nNamespace>.form.<field>Length` — length-rule message
- `<i18nNamespace>.actions.<action>` — action button label
- `<i18nNamespace>.confirm.<key>` — confirm dialog title (e.g., `confirm.deleteOne`)
- `<i18nNamespace>.messages.<key>` — toast messages (createSuccess, deleteSuccess, ...)
- `<i18nNamespace>.modal.<key>` — modal-specific (title, discardChanges, ...)

Top-level namespace = camelCase form of domain (e.g., `systemUser` for `system-user.json`).

## Date/Time Format

All BE timestamps are `Instant` (UTC). Display via shared helpers:

```typescript
// shared/lib/format.ts
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss [GMT]Z'
const DATE_FORMAT = 'YYYY-MM-DD'

export function formatDateTime(instant: string | undefined): string {
  if (!instant) return ''
  return dayjs(instant).format(DATETIME_FORMAT)
}

export function formatDate(instant: string | undefined): string {
  if (!instant) return ''
  return dayjs(instant).format(DATE_FORMAT)
}
```

Usage:

```tsx
{ title: t('common.createTime'), dataIndex: 'createTime', render: formatDateTime }
```

Output: `2025-12-01 14:30:00 GMT+07:00`. The `Z` is dynamic (browser timezone).

## Icons

```tsx
import { Icon } from '@iconify/react'

<Icon icon="ep:tools" width={16} height={16} />
<Icon icon="fa:medium" />
<Icon icon="simple-icons:civicrm" />
```

Icon strings come from the BE `system_menu.icon` field (Iconify convention, matches yudao seed). Centralize the wrapper if you need to:

```tsx
// shared/components/MenuIcon.tsx
export function MenuIcon({ name, size = 16 }: { name: string; size?: number }) {
  return <Icon icon={name} width={size} height={size} />
}
```

## Error Handling Tiers

1. **Axios response interceptor** (`shared/api/interceptors/`)
   - `code === 0` → pass response through unchanged. Callers do `.then(r => r.data.data)` to unwrap explicitly.
   - `code === 401` → auth-interceptor runs single-flight refresh, retries on success, dispatches logout on failure (Modal.confirm "Session expired" + dynamic-import dispatch).
   - Other `code !== 0` → error-interceptor shows `antdApp.message.error(msg)`, rejects with `Error(msg)`.
   - Network errors → show generic error toast.

2. **TanStack Query `onError`** (per-mutation/query)
   - Use when a specific operation needs custom handling (e.g., field-level errors on form).

3. **Component-level `form.setFields`** for BE field validation errors

   ```tsx
   const mutation = useMutation({
     mutationFn: userApi.create,
     onError: (err: any) => {
       // BE returns { code: <validation_code>, msg: 'Username taken', field: 'username' }
       if (err.field) form.setFields([{ name: err.field, errors: [err.message] }])
     },
   })
   ```

4. **Global Error Boundary** at AppShell root and around each `<Activity>` tab (per-tab isolation).

## Styling — Tailwind + antd token split

Two styling systems, strict boundary.

### Tailwind v4 — layout only

Use Tailwind utilities for HTML primitives (`div`, `span`, `section`, etc.):

- **Spacing**: `p-4`, `m-2`, `mt-1`, `gap-3`
- **Sizing**: `w-full`, `max-w-md`, `h-screen`, `min-h-[400px]`
- **Flex/grid**: `flex`, `items-center`, `justify-between`, `flex-col`, `grid`, `grid-cols-2`
- **Positioning**: `relative`, `absolute`, `top-0`, `z-10`, `inset-0`
- **Display**: `block`, `inline-flex`, `hidden`
- **Responsive**: `md:flex-row`, `lg:max-w-4xl`
- **Border radius / borders (non-color)**: `rounded-md`, `border`, `border-b`
- **Overflow / cursor / pointer-events**: `overflow-hidden`, `cursor-pointer`

### antd tokens — theme-aware properties

Use `theme.useToken()` for anything that should change with theme:

- All colors (text, background, border, brand)
- Component-level styling overrides via `ConfigProvider`

### Examples

```tsx
// ✅ Tailwind for layout, antd component handles itself
<div className="flex items-center justify-between gap-2 p-4">
  <h2 className="text-lg font-medium">{t('systemUser.page.title')}</h2>
  <Button type="primary">{t('common.create')}</Button>
</div>

// ✅ Grid wrapper, antd Card components inside
<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  <Card title={t('stats.users')}>{userCount}</Card>
  <Card title={t('stats.roles')}>{roleCount}</Card>
</div>

// ✅ antd token for theme-aware color
import { theme } from 'antd'
const { token } = theme.useToken()
<span style={{ color: token.colorTextSecondary }}>{hint}</span>

// ❌ Tailwind color — won't react to dark mode
<div className="bg-white text-gray-900">...</div>

// ❌ className on antd component overriding styles
<Button className="bg-red-500 text-white">Delete</Button>
// Use antd props:
<Button danger>Delete</Button>

// ❌ Verbose style for what Tailwind solves
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
// Use:
<div className="flex items-center gap-2">
```

### Hard rules

- **No color values in Tailwind** on theme-sensitive elements: never `bg-white`, `text-gray-900`, `bg-blue-500`, etc. Use antd tokens.
- **No arbitrary color values**: `bg-[#fff]` is forbidden. Same as above.
- **No hex/rgb literals** in inline `style` or CSS files.
- **No `className` on antd components** for visual styling. Use antd's props (`type`, `danger`, `size`, `variant`) or `ConfigProvider` theme overrides.
- **No magic spacing in `style={}`**: use Tailwind utilities for spacing/sizing.
- **No custom CSS files** unless absolutely necessary (one-off animation or override Tailwind can't express). If you write one, use CSS variables resolved from antd tokens, not hex.

### When in doubt

If the property changes between light and dark mode → antd token.
If the property is the same in both modes → Tailwind utility.

Spacing, sizing, layout don't change with theme → Tailwind.
Colors, brand styling, borders-with-color do change → antd token.

---

## Anti-patterns to avoid

### Dev-only workarounds for BE issues

**❌ Vite `server.proxy`** — common React community pattern that bypasses CORS in dev by proxying through the dev server. Forbidden in Soar because:

1. **Dev ≠ production behavior.** Proxy only exists when running `pnpm dev`. Production build has no Vite server. CORS issues that the proxy masked surface only in production.
2. **Workaround instead of fix.** If BE rejects FE requests, the correct response is to fix BE config (CORS, auth, headers), not to lie to the browser about origins.
3. **Hides BE configuration gaps.** Future dev assumes "this just works" without understanding the actual cross-origin contract.

Instead: BE must have correct CORS configuration. Soar BE (`SoarWebAutoConfiguration.corsFilterBean`) already does this. FE calls BE via absolute URL from `VITE_API_BASE_URL`.

### Other patterns to avoid

- **Disabling browser CORS via `--disable-web-security` flag**: same category as above, even worse.
- **Hardcoded credentials in code for testing**: use env vars even in test fixtures.
- **`@ts-ignore` / `@ts-expect-error` without justification**: a comment must explain why the suppression exists.
- **`eslint-disable-next-line` without justification**: same as above.
- **Commented-out code**: delete it. Git history is the archive.
- **Catch-and-swallow errors silently**: log or rethrow, never `catch (e) {}`.
- **`any` type sprinkled to bypass TS errors**: define the type properly, or use `unknown` and narrow.
- **Static `message` / `Modal` from `'antd'`** for actual usage: use `App.useApp()` in components or `antdApp` proxy in non-React code. See Patterns from Task 2.
- **`Form.Item normalize` for dict-typed fields**: breaks Select display. Use boundary conversion. See DictSelect tax.
- **Callbacks in mutation hooks**: caller chains `await mutateAsync()` + UI side effect.

---

## React Compiler

Soar enables React Compiler (auto-memoization) via `babel-plugin-react-compiler` in the Vite pipeline. **Trust the compiler** — write straightforward React; let it optimize.

### Default: no manual memoization

```tsx
// ✅ Idiomatic
function UserList({ users }: Props) {
  const [keyword, setKeyword] = useState('')
  const filtered = users.filter(u => u.name.includes(keyword))
  return (
    <>
      <Input.Search onSearch={setKeyword} />
      <Table dataSource={filtered} />
    </>
  )
}

// ❌ Pre-RC boilerplate — unnecessary
function UserList({ users }: Props) {
  const [keyword, setKeyword] = useState('')
  const filtered = useMemo(() => users.filter(u => u.name.includes(keyword)), [users, keyword])
  const handleSearch = useCallback((v: string) => setKeyword(v), [])
  return (
    <>
      <Input.Search onSearch={handleSearch} />
      <Table dataSource={filtered} />
    </>
  )
}
```

### Don't break the compiler

Compiler silently bails (no optimization, no warning) when components violate rules. Avoid:

- **Mutation during render**: `obj.x = 1`, `array.push(...)`, `Object.assign(obj, ...)`. Use immutable updates.
- **Ref mutations during render**: only mutate refs in effects/handlers, never in render body.
- **Conditional hooks**: standard Rules of Hooks — never put `useState` after an early return.
- **Function arg mutation**: `function fn(arr) { arr.push(x) }`. Pure functions only.

### When manual memoization is still right

Edge cases — profile first:

- Expensive computation where RC's auto-memo isn't sufficient (rare; verify with React DevTools profiler).
- `useEffect` dependency requires referential stability for an object literal RC didn't memoize. Wrap with `useMemo` if so.

### Verification

`pnpm build` runs the compiler. To audit a component:

- React DevTools Profiler → render time should not repeat the same computation across renders with the same inputs.
- Optional later: enable `eslint-plugin-react-compiler` (warning-level) to surface bail-outs.

---

## Patterns from Task 2 onwards

These patterns crystallized during Phase 5B Task 2 (system/user CRUD). They apply to all subsequent CRUD pages + general feature work. Each has a matching ADR with full rationale; this section is the everyday lookup.

### antd App API — never static `message`/`Modal` from `'antd'`

After Phase 5B T2.0a, antd `<App>` is wrapped in `providers.tsx`. ALL usage of `message`, `Modal`, `notification` goes through:

```tsx
// In React components — use App.useApp() hook
import { App } from 'antd'

function MyComponent() {
  const { message, modal, notification } = App.useApp()
  message.success('done')
  modal.confirm({ title: '...', onOk: () => ... })
}
```

```ts
// In non-React code (interceptors, store thunks, util modules) — use antdApp proxy
import { antdApp } from '@/shared/lib/antd-app-ref'

export function someInterceptor() {
  antdApp.message.error('Network error')
}
```

Never `import { message, Modal } from 'antd'` for actual usage. Static API toasts in unthemed container, also creates duplicate toasts (T2.0a-TD2 login page incident).

The only acceptable static import is for TYPES: `import type { MessageInstance } from 'antd/es/message/interface'`.

### DictSelect tax — form↔domain conversion at boundary

`<DictSelect>` emits string values (BE dict storage). Domain DTOs type these fields as `number` (BE enum ordinal). Convert at form↔domain boundary, NOT via `Form.Item normalize`.

**On load** (DTO → form via setFieldsValue):

```tsx
useEffect(() => {
  if (!detail) return
  form.setFieldsValue({
    sex: detail.sex == null ? undefined : String(detail.sex),
  })
}, [detail, form])
```

**On submit** (form → DTO):

```tsx
const handleSubmit = async () => {
  const values = await form.validateFields()
  const dto: SaveDTO = {
    sex: values.sex == null || values.sex === '' ? undefined : Number(values.sex),
  }
  // ...
}
```

**Form value type**: declare as `string`, not `number`:

```tsx
interface FormValues {
  sex?: string // ← string, matches DictSelect emit
}
```

Why not `Form.Item normalize`? Conversion at form layer breaks `<Select>` option lookup. See ADR 0004.

### Mutations no callback — caller chains `await mutateAsync()` + UI action

`useXxxMutations()` hook does **data work only** (toast + invalidate). UI side effects (close modal, clear selection) live at the call site.

```tsx
// in hook (hooks/index.ts)
const create = useMutation({
  mutationFn: (data: SaveDTO) => entityApi.create(data),
  onSuccess: () => {
    message.success(t('createSuccess'))
    void invalidateList()
    // NO onClose() here
  },
})

// in caller (form modal)
const handleSubmit = async () => {
  const values = await form.validateFields()
  await create.mutateAsync(dto)
  onClose() // ← UI side effect at caller
}
```

Why: hook stays reusable across page + form modal + other consumers without callback parameter coupling. If mutation throws (BE biz error toasted by interceptor), `onClose()` doesn't reach → modal stays open → user retries.

See ADR 0005.

### Self-protection — 4 enforcement points for user-like entities

If an entity has a "current user" concept (User, Admin, Account), enforce self-protection in 4 places:

```tsx
const currentUser = useAppSelector(selectUser)
const isSelf = (record: RespDTO) => record.id === currentUser?.id

// 1. Status switch column
<Switch
  disabled={isSelf(record) || updateStatus.isPending}
  onChange={checked => handleStatusToggle(record, checked)}
/>

// 2. Delete button in action column
<Button danger disabled={isSelf(record)} onClick={() => handleDelete(record)}>
  {t('delete')}
</Button>

// 3. Row checkbox (no bulk delete self)
<Table
  rowSelection={{
    getCheckboxProps: record => ({ disabled: isSelf(record) }),
  }}
/>

// 4. Edit + Reset Password REMAIN enabled — user manages own profile/password
```

For non-user entities (Role, Dept, Post, etc.), skip — no current-user concept.

### Hook extraction stage — MVP vs Mature

**MVP** (first CRUD page being built): keys + mutations + queries inline in the page component. Helpful while patterns are being discovered.

```tsx
// MVP — everything inline
function UserListPage() {
  const QUERY_KEY = ['system', 'user'] as const
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const { tableProps } = usePagedQuery({ baseQueryKey: QUERY_KEY, ... })

  const deleteOne = useMutation({
    mutationFn: id => userApi.delete(id),
    onSuccess: () => {
      message.success(t('...'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
  // ...
}
```

**Mature** (extraction triggered): move to `features/<module>/<entity>/hooks/index.ts`.

```tsx
// hooks/index.ts
export const sysUserQueryKey = { all: ['system', 'user'] as const, detail: id => [...] }
export function useUserDetailQuery(id) { ... }
export function useUserMutations() { return { create, update, remove, ... } }

// page
const { remove, removeMany } = useUserMutations()
```

**Extraction trigger** — extract when ANY:

- 3rd consumer needs the same mutation (Rule of Three)
- Page exceeds ~400 lines
- More than 4 mutations on the same entity

Don't extract speculatively for page #1 — patterns crystallize from real usage.

### Vertical form layout — default

```tsx
<Form layout="vertical">
  <Form.Item name="..." label="...">
    {/* label appears above input */}
    <Input />
  </Form.Item>
</Form>
```

Use `layout="horizontal"` only with explicit reason. Vertical layout:

- Labels never truncate (Phase 5B T2.3 issue with horizontal)
- Works better on narrow screens
- Vietnamese diacritics fit naturally

For 2-column dense forms, use `<Row gutter={16}>` + `<Col span={12}>`:

```tsx
<Form layout="vertical">
  <Row gutter={16}>
    <Col span={12}>
      <Form.Item name="username">...</Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="password">...</Form.Item>
    </Col>
  </Row>
  {/* Long-text field full-width */}
  <Row>
    <Col span={24}>
      <Form.Item name="remark">
        <Input.TextArea />
      </Form.Item>
    </Col>
  </Row>
</Form>
```

### Import path convention

| Source                                                       | Style                            |
| ------------------------------------------------------------ | -------------------------------- |
| External packages (`react`, `antd`, `@tanstack/react-query`) | bare import                      |
| `@/app/*` (Redux, store, slices)                             | absolute `@/...`                 |
| `@/shared/*` (hooks, components, lib)                        | absolute `@/...`                 |
| `@/features/<other-feature>/*` (cross-feature)               | absolute `@/...`                 |
| Within current feature folder                                | relative `../api`, `./component` |

Group order in import section:

```tsx
// External
import { useState } from 'react'
import { App, Button, Form } from 'antd'
import { useMutation } from '@tanstack/react-query'

// App + shared absolute
import { selectUser } from '@/app/slices/auth-slice'
import { HasPermission } from '@/features/permission'
import { useTableState } from '@/shared/hooks/use-table-state'

// Same-feature relative
import { userApi } from '../api'
import type { UserRespDTO } from '../types'
import { useUserMutations } from '../hooks'
```

Separate groups with blank lines. Tooling (eslint, sort-imports plugin) can auto-enforce.

### `dependencies` for cross-field validators

When a Form.Item validator references another field via `getFieldValue`, MUST include `dependencies={[otherField]}`. Otherwise validator only re-runs when its own field changes — not when the referenced field changes.

```tsx
<Form.Item
  name="confirmPassword"
  dependencies={['newPassword']} // ← REQUIRED
  rules={[
    { required: true, message: t('confirmRequired') },
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
        return Promise.reject(new Error(t('mismatch')))
      },
    }),
  ]}
>
  <Input.Password />
</Form.Item>
```

Common omission — antd doesn't warn at compile time. Manifests as: user fills both fields, changes first field, second's validator stays stale.

### References

For full deliberation behind each pattern:

- ADR 0004 — DictSelect string-boundary
- ADR 0005 — Mutations no callback
- `skills/crud-page/_example/` — concrete reference for all patterns
- `docs/decisions/tasks/5b/T2.*-*.md` — original task deliberations

---

## Git Conventions

- Branch: `feature/{phase}-{description}` (e.g., `feature/phase5a-scaffold`, `feature/phase5d-user-crud`)
- Commit: Conventional Commits
  - `feat: add user list page with antd Table`
  - `fix: handle 401 retry race in refresh-token flow`
  - `refactor: extract DictSelect to shared components`
  - `chore: bump antd to 6.0.x`
