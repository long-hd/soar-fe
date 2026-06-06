# Skill: Create CRUD Page (Frontend)

## When to Use

Building a new CRUD management page for an entity that already has backend APIs and a menu seeded in `system_menu` with `tab_key`.

## Input Needed

- Entity name (e.g., `User`)
- Module (e.g., `system`, `infra`)
- BE API base path (e.g., `/admin-api/system/user`)
- Menu `tab_key` (e.g., `system-user`) and `component` path (e.g., `system/user/index`) — must already exist in `system_menu`
- Fields for: table columns, search form, create/edit form
- Permission codes (e.g., `system:user:list`, `system:user:create`, `system:user:update`, `system:user:delete`)
- i18n keys (or list of labels to add to locale files)

## Pre-flight check

Before writing any code:

1. **Verify menu seed**:

   ```sql
   SELECT id, name, type, tab_key, component, permission, visible
   FROM system_menu
   WHERE tab_key IN ('system-user', 'system-user-detail');
   ```

   - List page menu (`type=2`, `visible=true`) must have `tab_key` and `component` populated.
   - Detail page menu (`type=2`, `visible=false`) optional — needed for deep linking.
   - Button menus (`type=3`) for create/update/delete must have matching `permission` codes.

2. **Verify BE endpoints exist**: `page`, `get`, `create`, `update`, `delete` — minimum.

3. **Confirm DTO shape** with BE by inspecting actual response (or BE source).

If anything is missing, request BE to add before proceeding.

## Steps

### 1. Types (`features/{module}/{entity}/types.ts`)

Mirror BE DTO shape with suffix `DTO`:

```typescript
export interface UserListItemDTO {
  id: number
  username: string
  nickname: string
  email?: string
  mobile?: string
  status: number // common_status dict
  deptId?: number
  createTime: string // Instant UTC
}

export interface UserDetailDTO extends UserListItemDTO {
  roleIds: number[]
  postIds: number[]
  remark?: string
}

export interface UserCreateReqDTO {
  username: string
  password: string
  nickname: string
  email?: string
  mobile?: string
  deptId?: number
  postIds?: number[]
  roleIds?: number[]
}

export interface UserUpdateReqDTO extends Partial<Omit<UserCreateReqDTO, 'username' | 'password'>> {
  id: number
}

export interface UserPageReqDTO {
  pageNo: number
  pageSize: number
  username?: string
  nickname?: string
  status?: number
  deptId?: number
}
```

### 2. API (`features/{module}/{entity}/api/index.ts`)

Action-path style, matches BE:

```typescript
import { http } from '@/shared/api/http-client'
import type { PageResult } from '@/shared/api/types'
import type {
  UserListItemDTO,
  UserDetailDTO,
  UserCreateReqDTO,
  UserUpdateReqDTO,
  UserPageReqDTO,
} from '../types'

const URL_PREFIX = '/admin-api/system/user'

export const userApi = {
  page: (params: UserPageReqDTO) =>
    http.get<PageResult<UserListItemDTO>>(`${URL_PREFIX}/page`, { params }),

  get: (id: number) => http.get<UserDetailDTO>(`${URL_PREFIX}/get`, { params: { id } }),

  create: (data: UserCreateReqDTO) => http.post<number>(`${URL_PREFIX}/create`, data),

  update: (data: UserUpdateReqDTO) => http.put<boolean>(`${URL_PREFIX}/update`, data),

  delete: (id: number) => http.delete<boolean>(`${URL_PREFIX}/delete`, { params: { id } }),
}
```

### 3. Search form (`features/{module}/{entity}/components/{entity}-search-form.tsx`)

Filter bar above the table. Stateless from the page's perspective — receives `value` and emits `onChange`.

```tsx
import { Form, Input, Select, Button, Space } from 'antd'
import { DictSelect } from '@/shared/components/DictSelect'
import type { UserPageReqDTO } from '../types'

interface Props {
  value: Partial<UserPageReqDTO>
  onChange: (v: Partial<UserPageReqDTO>) => void
}

export function UserSearchForm({ value, onChange }: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const onSearch = (values: any) => {
    onChange({ ...values, pageNo: 1 })
  }

  const onReset = () => {
    form.resetFields()
    onChange({})
  }

  return (
    <Form
      form={form}
      layout="inline"
      initialValues={value}
      onFinish={onSearch}
      style={{ marginBottom: 16 }}
    >
      <Form.Item name="username" label={t('system.user.field.username')}>
        <Input allowClear />
      </Form.Item>
      <Form.Item name="status" label={t('system.user.field.status')}>
        <DictSelect dictType="common_status" allowClear />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            {t('common.search')}
          </Button>
          <Button onClick={onReset}>{t('common.reset')}</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
```

### 4. List page (`features/{module}/{entity}/components/{entity}-list-page.tsx`)

Main page. Uses antd Card → Search form → Toolbar → Table → Modal.

```tsx
import { Card, Button, Space, Table, Popconfirm, message } from 'antd'
import { HasPermission } from '@/shared/components/HasPermission'
import { DictTag } from '@/shared/components/DictTag'
import { usePagedQuery } from '@/shared/hooks/usePagedQuery'
import { formatDateTime } from '@/shared/lib/format'
import { userApi } from '../api'
import { UserSearchForm } from './user-search-form'
import { UserFormModal } from './user-form-modal'
import type { UserListItemDTO, UserPageReqDTO } from '../types'

/**
 * User management list page.
 * Displays paginated user table with search, create, edit, delete actions.
 * All actions permission-gated. Server data via TanStack Query.
 */
export default function UserListPage() {
  const { t } = useTranslation()
  const [tableState, setTableState] = useState({ pageNo: 1, pageSize: 10 })
  const [filters, setFilters] = useState<Partial<UserPageReqDTO>>({})
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; id?: number }>({
    open: false,
    mode: 'create',
  })

  const queryClient = useQueryClient()

  const { tableProps } = usePagedQuery({
    queryKey: ['user', 'list', { ...tableState, ...filters }],
    queryFn: () => userApi.page({ ...tableState, ...filters } as UserPageReqDTO),
    state: tableState,
    setState: setTableState,
  })

  const deleteMutation = useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      message.success(t('common.deleted'))
      queryClient.invalidateQueries({ queryKey: ['user', 'list'] })
    },
  })

  const columns: ColumnsType<UserListItemDTO> = [
    { title: t('system.user.field.username'), dataIndex: 'username', width: 150 },
    { title: t('system.user.field.nickname'), dataIndex: 'nickname', width: 150 },
    { title: t('system.user.field.email'), dataIndex: 'email', width: 200 },
    {
      title: t('system.user.field.status'),
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
            <Button
              size="small"
              onClick={() => setModal({ open: true, mode: 'edit', id: record.id })}
            >
              {t('common.edit')}
            </Button>
          </HasPermission>
          <HasPermission code="system:user:delete">
            <Popconfirm
              title={t('common.confirmDelete')}
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button size="small" danger>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          </HasPermission>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <UserSearchForm value={filters} onChange={setFilters} />

      <Space style={{ marginBottom: 16 }}>
        <HasPermission code="system:user:create">
          <Button type="primary" onClick={() => setModal({ open: true, mode: 'create' })}>
            {t('common.create')}
          </Button>
        </HasPermission>
      </Space>

      <Table {...tableProps} columns={columns} rowKey="id" scroll={{ x: 1200 }} />

      <UserFormModal
        open={modal.open}
        mode={modal.mode}
        id={modal.id}
        onClose={() => setModal(m => ({ ...m, open: false }))}
      />
    </Card>
  )
}
```

### 5. Form modal (`features/{module}/{entity}/components/{entity}-form-modal.tsx`)

antd Form inside antd Modal. Loads detail on edit.

```tsx
import { Modal, Form, Input, message } from 'antd'
import { DeptTreeSelect } from '@/shared/components/DeptTreeSelect'
import { userApi } from '../api'
import type { UserCreateReqDTO, UserUpdateReqDTO } from '../types'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  id?: number
  onClose: () => void
}

/**
 * Create/edit modal for User entity.
 * Loads detail via API when mode === 'edit' && id is given.
 * Submits via create or update API depending on mode.
 */
export function UserFormModal({ open, mode, id, onClose }: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<UserCreateReqDTO>()
  const queryClient = useQueryClient()

  // Load detail when editing
  const detailQuery = useQuery({
    queryKey: ['user', 'detail', id],
    queryFn: () => userApi.get(id!),
    enabled: open && mode === 'edit' && id != null,
  })

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (mode === 'edit' && detailQuery.data) {
      form.setFieldsValue(detailQuery.data)
    }
  }, [open, mode, detailQuery.data])

  const mutation = useMutation({
    mutationFn: (values: any) =>
      mode === 'create' ? userApi.create(values) : userApi.update({ ...values, id }),
    onSuccess: () => {
      message.success(t(mode === 'create' ? 'common.created' : 'common.updated'))
      queryClient.invalidateQueries({ queryKey: ['user', 'list'] })
      onClose()
    },
    onError: (err: any) => {
      // BE field-level errors (if shape includes { field, message }) map to form
      if (err?.field) {
        form.setFields([{ name: err.field, errors: [err.message] }])
      }
    },
  })

  return (
    <Modal
      open={open}
      title={t(`system.user.${mode}`)}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={mutation.mutate}>
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

### 6. Page wrapper (`src/pages/{module}/{entity}/index.tsx`)

Thin dispatcher target. Must exist for `import.meta.glob` to discover it.

```tsx
import UserListPage from '@/features/system/user/components/user-list-page'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { useTranslation } from 'react-i18next'

export default function Page() {
  const { t } = useTranslation()
  useDocumentTitle(t('system.user.title'))
  return <UserListPage />
}
```

The path `src/pages/system/user/index.tsx` must match `system_menu.component` for `tab_key = 'system-user'`. If the menu's `component` field is `system/user/index`, this file location is correct.

### 7. i18n keys (`shared/i18n/locales/en.json` and others)

Add the labels referenced in the page:

```json
{
  "system.user.title": "User Management",
  "system.user.create": "Create User",
  "system.user.edit": "Edit User",
  "system.user.field.username": "Username",
  "system.user.field.password": "Password",
  "system.user.field.nickname": "Nickname",
  "system.user.field.email": "Email",
  "system.user.field.status": "Status",
  "system.user.field.dept": "Department"
}
```

`common.*` keys (`create`, `edit`, `delete`, `cancel`, `search`, `reset`, `created`, `updated`, `deleted`, `confirmDelete`, `createTime`, `action`) should already exist in the base locale file.

### 8. No router change needed

Unlike traditional React Router setups, there is **no route to register**. The page is discovered automatically:

- `src/pages/system/user/index.tsx` exists → matches `system_menu.component`.
- User clicks the sidebar menu item → AppShell looks up `tab_key = 'system-user'` → finds matching menu → resolves component `system/user/index` → renders.

If the page is meant to be a hidden detail page (e.g., `system-user-detail`), make sure the BE seed has the corresponding menu row with `visible=false`. FE side, just create the wrapper at `src/pages/system/user/detail.tsx`.

## Result file structure

```
features/system/user/
├── api/
│   └── index.ts
├── components/
│   ├── user-list-page.tsx
│   ├── user-form-modal.tsx
│   └── user-search-form.tsx
└── types.ts

src/pages/system/user/
└── index.tsx                       # thin wrapper

shared/i18n/locales/
├── en.json                          # add user labels
├── vi.json                          # add user labels (when localizing)
└── zh-CN.json                       # add user labels (when localizing)
```

## Verification

- [ ] `pnpm type-check` passes
- [ ] Menu row with correct `tab_key` and `component` exists in `system_menu`
- [ ] Permission codes referenced in `<HasPermission>` match BE seed
- [ ] Page accessible by navigating sidebar menu (no manual URL typing required)
- [ ] Deep link works: `/?tab=system-user&pageNo=2` opens the page on page 2
- [ ] List → Detail (if exists) → browser back → list state preserved (when `keepAlive=true` and Activity active)
- [ ] Create/edit modal opens, submits, refreshes list, shows success toast
- [ ] Delete confirms, refreshes list
- [ ] Action buttons hidden when user lacks the corresponding permission code
- [ ] All visible strings go through `t()`
- [ ] All timestamps go through `formatDateTime`
- [ ] No `any` types
- [ ] No hardcoded colors or magic numbers
- [ ] No `useEffect` for data fetching (use TanStack Query)
- [ ] Forms use antd Form, not RHF
- [ ] Query keys follow `['<entity>', '<scope>', ...]` convention

## Reference

- Master architecture: `soar-be/docs/FE_Admin_Architecture_Plan.md`
- Convention details: `agents/fe/CONVENTIONS.md`
- Existing pages in the same module for stylistic consistency.
