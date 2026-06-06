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
| HTTP             | axios                                      | axios                                                          |

---

## Naming Conventions

| Type                 | Convention                                | Example                                                                                                                               |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Component file       | kebab-case                                | `user-list-page.tsx`, `user-form-modal.tsx`                                                                                           |
| Component name       | PascalCase (in code)                      | `export default function UserListPage()`                                                                                              |
| Hook file            | kebab-case with `use-` prefix             | `use-permission.ts`, `use-paged-query.ts`                                                                                             |
| Hook name            | camelCase with `use` prefix               | `usePermission()`, `usePagedQuery()`                                                                                                  |
| Utility file         | kebab-case                                | `format.ts`, `permission-matcher.ts`                                                                                                  |
| Type/Interface       | PascalCase + DTO suffix for BE-mirrored   | `UserListItemDTO`, `PageResult<T>`                                                                                                    |
| Constant             | UPPER_SNAKE_CASE                          | `API_BASE_URL`, `DEFAULT_PAGE_SIZE`                                                                                                   |
| Redux slice file     | kebab-case `.slice.ts`                    | `auth.slice.ts` → export `authSlice`                                                                                                  |
| API function         | camelCase verb on api object              | `userApi.page()`, `userApi.create()`                                                                                                  |
| Query key            | array, feature-namespaced                 | `['user', 'list', params]`, `['user', 'detail', id]`                                                                                  |
| i18n key             | dot-separated, feature-namespaced         | `system.user.field.username`, `common.cancel`                                                                                         |
| CSS classes          | antd built-in + design tokens             | Tailwind v4 utilities for layout (`flex`, `p-4`, `gap-2`); antd tokens for theme-aware colors; no custom CSS unless absolutely needed |
| `tab_key` (BE field) | kebab-case `<module>-<entity>[-<action>]` | `system-user`, `system-user-detail`, `infra-job-log`                                                                                  |

## File Organization per Feature

```
features/system/user/
├── api/
│   └── index.ts                # userApi: page, get, create, update, delete, ...
├── components/
│   ├── user-list-page.tsx      # Main list page
│   ├── user-detail-page.tsx    # Detail page (linked from hidden menu)
│   ├── user-form-modal.tsx     # Create/edit modal (uses antd Form)
│   ├── user-search-form.tsx    # Filter bar above table
│   └── user-columns.tsx        # Column definitions (exported as function or value)
├── hooks/
│   └── use-user-list.ts        # Optional — domain-specific hook
├── types.ts                    # UserListItemDTO, UserCreateReqDTO, ...
└── index.ts                    # Re-export public surface (mostly unused — pages import directly)
```

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
export default function UserListPage() {
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
// Invalidate all queries under ['user'] (not just ['user', 'list']) because
// updating a user may affect role mapping, dept tree, and the active session.
queryClient.invalidateQueries({ queryKey: ['user'] })

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
interface UserListItemDTO {
  id: number
  username: string
  nickname: string
  email?: string
  mobile?: string
  status: number // dict 'common_status'
  deptId?: number
  createTime: string // Instant — formatted on render via formatDateTime
}

interface UserCreateReqDTO {
  username: string
  password: string
  nickname: string
  email?: string
  mobile?: string
  deptId?: number
  postIds?: number[]
  roleIds?: number[]
}

interface UserUpdateReqDTO extends Partial<Omit<UserCreateReqDTO, 'username' | 'password'>> {
  id: number
}

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
import { http } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type { UserListItemDTO, UserCreateReqDTO, UserUpdateReqDTO, UserPageReqDTO } from '../types'

// Action-path style — match yudao backend convention exactly
const URL_PREFIX = '/admin-api/system/user'

export const userApi = {
  page: (params: UserPageReqDTO) =>
    http.get<PageResult<UserListItemDTO>>(`${URL_PREFIX}/page`, { params }),

  get: (id: number) => http.get<UserListItemDTO>(`${URL_PREFIX}/get`, { params: { id } }),

  create: (data: UserCreateReqDTO) => http.post<number>(`${URL_PREFIX}/create`, data),

  update: (data: UserUpdateReqDTO) => http.put<boolean>(`${URL_PREFIX}/update`, data),

  delete: (id: number) => http.delete<boolean>(`${URL_PREFIX}/delete`, { params: { id } }),
}
```

Note: `http` is the axios instance wrapped to **unwrap CommonResult**, so return types are `T` not `CommonResult<T>`. The interceptor resolves with `data.data` when `code === 0`.

## TanStack Query Pattern

```typescript
// In component or custom hook
const { data, isLoading } = useQuery({
  queryKey: ['user', 'list', tableState],
  queryFn: () => userApi.page(tableState),
})

// Mutation
const queryClient = useQueryClient()
const createMutation = useMutation({
  mutationFn: userApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['user', 'list'] })
    message.success(t('common.created'))
    setModalOpen(false)
  },
  // Errors surface globally via axios interceptor — no per-call onError needed by default
})
```

## Table + Pagination Pattern

```tsx
import { Table, Card, Button, Space } from 'antd'
import { usePagedQuery } from '@/shared/hooks/usePagedQuery'

export default function UserListPage() {
  const [tableState, setTableState] = useState({ pageNo: 1, pageSize: 10 })
  const [filters, setFilters] = useState<UserPageReqDTO>({})

  const { tableProps } = usePagedQuery({
    queryKey: ['user', 'list', { ...tableState, ...filters }],
    queryFn: () => userApi.page({ ...tableState, ...filters }),
    state: tableState,
    setState: setTableState,
  })
  // tableProps = { dataSource, loading, pagination: { current, pageSize, total, onChange } }

  const columns: ColumnsType<UserListItemDTO> = [
    { title: t('user.field.username'), dataIndex: 'username', width: 150 },
    {
      title: t('user.field.status'),
      dataIndex: 'status',
      width: 100,
      render: status => <DictTag dictType="common_status" value={status} />,
    },
    {
      title: t('common.createTime'),
      dataIndex: 'createTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: t('common.action'),
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <HasPermission code="system:user:update">
            <Button onClick={() => openEdit(record.id)}>{t('common.edit')}</Button>
          </HasPermission>
          <HasPermission code="system:user:delete">
            <Popconfirm onConfirm={() => deleteUser(record.id)} title={t('common.confirmDelete')}>
              <Button danger>{t('common.delete')}</Button>
            </Popconfirm>
          </HasPermission>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <UserSearchForm value={filters} onChange={setFilters} />
      <Table {...tableProps} columns={columns} rowKey="id" />
    </Card>
  )
}
```

## Form + Modal Pattern (antd Form, no RHF)

```tsx
import { Modal, Form, Input, Select, message } from 'antd'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialValue?: UserListItemDTO
  onClose: () => void
}

export default function UserFormModal({ open, mode, initialValue, onClose }: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<UserCreateReqDTO>()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: UserCreateReqDTO | UserUpdateReqDTO) =>
      mode === 'create'
        ? userApi.create(values as UserCreateReqDTO)
        : userApi.update(values as UserUpdateReqDTO),
    onSuccess: () => {
      message.success(t(`common.${mode}d`)) // common.created / common.updated
      queryClient.invalidateQueries({ queryKey: ['user', 'list'] })
      onClose()
    },
  })

  useEffect(() => {
    if (open) {
      form.resetFields()
      if (initialValue) form.setFieldsValue(initialValue)
    }
  }, [open, initialValue])

  return (
    <Modal
      open={open}
      title={t(`system.user.${mode}`)}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={values =>
          mutation.mutate(mode === 'edit' ? { ...values, id: initialValue!.id } : values)
        }
      >
        <Form.Item
          name="username"
          label={t('system.user.field.username')}
          rules={[{ required: true, max: 30 }]}
        >
          <Input disabled={mode === 'edit'} />
        </Form.Item>

        {mode === 'create' && (
          <Form.Item
            name="password"
            label={t('system.user.field.password')}
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
        )}

        <Form.Item
          name="nickname"
          label={t('system.user.field.nickname')}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="email" label={t('system.user.field.email')} rules={[{ type: 'email' }]}>
          <Input />
        </Form.Item>

        <Form.Item name="deptId" label={t('system.user.field.dept')}>
          <DeptTreeSelect />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

**Notes**:

- `Form.useForm()` is the antd hook; no `useForm` from RHF.
- Validation is declarative via `rules` on `Form.Item`. No zod schema.
- BE field-level errors map via `form.setFields([{ name: 'username', errors: ['...'] }])`.
- `destroyOnHidden` ensures the form re-mounts cleanly on next open (important if reusing for create/edit).

## Permission Usage Pattern

```tsx
// Conditional rendering
import { HasPermission } from '@/shared/components/HasPermission'

<HasPermission code="system:user:create">
  <Button type="primary" onClick={openCreate}>{t('common.create')}</Button>
</HasPermission>

// Optional fallback
<HasPermission code="system:user:export" fallback={<Tooltip title={t('common.noPermission')}><Button disabled>{t('common.export')}</Button></Tooltip>}>
  <Button onClick={doExport}>{t('common.export')}</Button>
</HasPermission>

// Programmatic check
import { usePermission } from '@/shared/hooks/usePermission'

const can = usePermission()
if (can('system:user:delete')) { /* ... */ }
```

`HasPermission` and `usePermission` handle the `*:*:*` wildcard automatically — never inline that check yourself.

## i18n Pattern

```tsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()

// In JSX
<Button>{t('common.save')}</Button>

// Form item label
<Form.Item label={t('system.user.field.username')} ... />

// With interpolation
<Alert message={t('common.deletedCount', { count: 3 })} />

// In code (toasts, etc.)
message.success(t('common.saved'))
```

**Rule**: every visible string in JSX or in `message.*` / `notification.*` / `Modal.confirm` must go through `t()`. Do not hardcode English strings.

i18n key structure:

- `common.*` — shared across features (cancel, save, edit, delete, confirm, etc.)
- `<module>.<entity>.title` — page title
- `<module>.<entity>.field.<fieldName>` — form field label
- `<module>.<entity>.action.<actionName>` — action button label (when not in common)
- `<module>.<entity>.message.<msgKey>` — domain-specific messages

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

1. **Axios response interceptor** (`shared/api/interceptors/error-interceptor.ts`)
   - `code === 0` → resolve with `data.data`.
   - `code === 401` → single-flight refresh, retry on success, logout on failure.
   - Other `code !== 0` → show `message.error(msg)`, reject with `Error(msg)`.
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
  <h2 className="text-lg font-medium">{t('user.title')}</h2>
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

## Git Conventions

- Branch: `feature/{phase}-{description}` (e.g., `feature/phase5a-scaffold`, `feature/phase5d-user-crud`)
- Commit: Conventional Commits
  - `feat: add user list page with antd Table`
  - `fix: handle 401 retry race in refresh-token flow`
  - `refactor: extract DictSelect to shared components`
  - `chore: bump antd to 6.0.x`
