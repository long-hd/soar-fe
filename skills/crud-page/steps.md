# Build Steps: 9-Step CRUD Page Construction

Execute these 9 steps to build a complete CRUD page. Each step has a template skeleton + decisions to apply + verification check.

Templates use `<PLACEHOLDER>` syntax. Replace from extraction artifact (`be-extraction.md`) + decision outcomes (`decisions.md`).

**Reference**: For any unclear pattern, check `_example/` — system/user is the canonical reference.

---

## Pre-flight (before Step 1)

Verify you have:

- [ ] Extraction artifact (from `be-extraction.md`) with all DTO fields + endpoints + permissions
- [ ] Decision outcomes (from `decisions.md`) for: bulk delete, status toggle, reset password, self-protection, sortable, variant gates
- [ ] Placeholder values resolved:
  - `<ENTITY>` = PascalCase singular (e.g., `Role`, `Post`)
  - `<entity>` = camelCase singular (e.g., `role`, `post`)
  - `<entity-kebab>` = kebab-case singular (e.g., `role`, `post`) — usually same as camelCase for single-word
  - `<module>` = lowercase module name (e.g., `system`, `infra`)
  - `<MODULE>` = uppercase prefix for constants (e.g., `SYSTEM`)
  - `<i18nNamespace>` = camelCase combined (e.g., `systemRole`, `systemUser`)
  - `<i18n-file>` = `<module>-<entity-kebab>` for JSON filename

---

## Step 1: `types.ts`

**File**: `src/features/<module>/<entity-kebab>/types.ts`

**Purpose**: Define TS interfaces mirroring BE DTOs + filter type + page request type.

**Template**:

```typescript
import type { SortParams } from '@/shared/types/api'

// ===== Response DTO =====

export interface <ENTITY>RespDTO {
  id: number
  <field>: <tsType>           // for each field in extraction artifact's RespDTO
  // ...
  createTime: string          // ISO Instant
}

// ===== Save DTO (create + update unified) =====

export interface <ENTITY>SaveReqDTO {
  id?: number                 // undefined = create, set = update
  <field>: <tsType>           // for each field in extraction artifact's SaveReqDTO
  // ...
}

// ===== Side endpoint DTOs (only if features applicable) =====

// Include only if `features.statusToggle: true`
export interface <ENTITY>UpdateStatusReqDTO {
  id: number
  status: number
}

// Include only if `features.passwordReset: true`
export interface <ENTITY>UpdatePasswordReqDTO {
  id: number
  password: string
}

// ===== Search filters =====

export interface <ENTITY>Filters extends Record<string, unknown> {
  <field>?: <tsType>          // for each search field from extraction (Step 8)
  // ...
}

// ===== Page request shape =====

export type <ENTITY>PageReqParams = {
  pageNo: number
  pageSize: number
  // include sortingFields ONLY if features.sortable: true
  sortingFields?: SortParams[]
} & <ENTITY>Filters
```

**Decisions to apply**:

- Skip `<ENTITY>UpdateStatusReqDTO` if no statusToggle
- Skip `<ENTITY>UpdatePasswordReqDTO` if no passwordReset
- Skip `sortingFields` from `<ENTITY>PageReqParams` if not sortable

**Apply DictSelect tax field types**: in `<ENTITY>Filters`, dict-typed fields stay `number` (the DTO type). Form values handle the string conversion (see Step 6).

**Reference**: `_example/types.ts`

**Verification**: `pnpm type-check` — should pass after this file alone (no caller code yet).

---

## Step 2: `constants.ts`

**File**: `src/features/<module>/<entity-kebab>/constants.ts`

**Purpose**: Permission code map, dict types, enum constants.

**Template**:

```typescript
// ===== Permission codes =====

export const <ENTITY>_PERMISSIONS = {
  query:  '<module>:<entity>:query',
  create: '<module>:<entity>:create',
  update: '<module>:<entity>:update',
  delete: '<module>:<entity>:delete',
  // Include only if features.passwordReset: true:
  updatePassword: '<module>:<entity>:update-password',
} as const

// ===== Dict types =====

export const <ENTITY>_DICT_TYPES = {
  // For each dict type the entity uses, e.g.:
  status: 'common_status',
  sex:    'user_sex',
  // ...
} as const

// ===== Enum values matching BE =====

// Include only if entity has status field:
export const <ENTITY>Status = {
  ENABLED:  0,
  DISABLED: 1,
} as const

// Include other enum mirrors as needed
```

**Decisions to apply**:

- Omit `updatePassword` permission if no passwordReset
- Omit `<ENTITY>_DICT_TYPES` object entirely if entity uses no dicts
- Add additional enum mirrors only if entity has more dict-typed fields

**Reference**: `_example/constants.ts`

---

## Step 3: `api/index.ts`

**File**: `src/features/<module>/<entity-kebab>/api/index.ts`

**Purpose**: HTTP client methods. Follow Phase 5A unwrap pattern (ADR 0002).

**Template**:

```typescript
import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type {
  <ENTITY>PageReqParams,
  <ENTITY>RespDTO,
  <ENTITY>SaveReqDTO,
  // Conditional imports:
  <ENTITY>UpdatePasswordReqDTO,  // if passwordReset
  <ENTITY>UpdateStatusReqDTO,    // if statusToggle
} from '../types'

const BASE = '<basePath>'  // e.g., '/admin-api/system/role'

export const <entity>Api = {
  page(params: <ENTITY>PageReqParams): Promise<PageResult<<ENTITY>RespDTO>> {
    return request
      .get<CommonResult<PageResult<<ENTITY>RespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<<ENTITY>RespDTO> {
    return request
      .get<CommonResult<<ENTITY>RespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: <ENTITY>SaveReqDTO): Promise<number> {
    return request
      .post<CommonResult<number>>(`${BASE}/create`, data)
      .then(r => r.data.data)
  },

  update(data: <ENTITY>SaveReqDTO): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${BASE}/update`, data)
      .then(r => r.data.data)
  },

  delete(id: number): Promise<boolean> {
    return request
      .delete<CommonResult<boolean>>(`${BASE}/delete`, { params: { id } })
      .then(r => r.data.data)
  },

  // Include if features.bulkDelete: true:
  deleteList(ids: number[]): Promise<boolean> {
    return request
      .delete<CommonResult<boolean>>(`${BASE}/delete-list`, { params: { ids } })
      .then(r => r.data.data)
  },

  // Include if features.statusToggle: true:
  updateStatus(data: <ENTITY>UpdateStatusReqDTO): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${BASE}/update-status`, data)
      .then(r => r.data.data)
  },

  // Include if features.passwordReset: true:
  updatePassword(data: <ENTITY>UpdatePasswordReqDTO): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${BASE}/update-password`, data)
      .then(r => r.data.data)
  },
}
```

**Decisions to apply**:

- Drop `deleteList`, `updateStatus`, `updatePassword` methods based on features

**Reference**: `_example/api.ts`

**Verification**: `pnpm type-check` — no errors.

---

## Step 4: `hooks/index.ts`

**File**: `src/features/<module>/<entity-kebab>/hooks/index.ts`

**Purpose**: Query keys + parameterized queries + collected mutations.

**Template**:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { <entity>Api } from '@/features/<module>/<entity-kebab>/api'
import type {
  <ENTITY>SaveReqDTO,
  <ENTITY>UpdatePasswordReqDTO,  // if passwordReset
  <ENTITY>UpdateStatusReqDTO,    // if statusToggle
} from '@/features/<module>/<entity-kebab>/types'

export const <ENTITY>_QUERY_KEY = ['<module>', '<entity>'] as const

export const sys<ENTITY>QueryKey = {
  all: <ENTITY>_QUERY_KEY,
  detail: (id: number) => [...sys<ENTITY>QueryKey.all, 'detail', id] as const,
}

// ===== Queries =====

export function use<ENTITY>DetailQuery(
  id: number | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: sys<ENTITY>QueryKey.detail(id!),
    queryFn: () => <entity>Api.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

// ===== Mutations =====

export function use<ENTITY>Mutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: <ENTITY>_QUERY_KEY })

  const create = useMutation({
    mutationFn: (data: <ENTITY>SaveReqDTO) => <entity>Api.create(data),
    onSuccess: () => {
      message.success(t('<i18nNamespace>.messages.createSuccess'))
      void invalidateList()
    },
  })

  const update = useMutation({
    mutationFn: (data: <ENTITY>SaveReqDTO) => <entity>Api.update(data),
    onSuccess: () => {
      message.success(t('<i18nNamespace>.messages.updateSuccess'))
      void invalidateList()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => <entity>Api.delete(id),
    onSuccess: () => {
      message.success(t('<i18nNamespace>.messages.deleteSuccess'))
      void invalidateList()
    },
  })

  // Include if features.bulkDelete:
  const removeMany = useMutation({
    mutationFn: (ids: number[]) => <entity>Api.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(
        t('<i18nNamespace>.messages.deleteBulkSuccess', { count: ids.length }),
      )
      void invalidateList()
    },
  })

  // Include if features.statusToggle:
  const updateStatus = useMutation({
    mutationFn: (vars: <ENTITY>UpdateStatusReqDTO) => <entity>Api.updateStatus(vars),
    onSuccess: () => {
      message.success(t('<i18nNamespace>.messages.statusUpdateSuccess'))
      void invalidateList()
    },
  })

  // Include if features.passwordReset:
  const updatePassword = useMutation({
    mutationFn: (vars: <ENTITY>UpdatePasswordReqDTO) =>
      <entity>Api.updatePassword(vars),
    onSuccess: () => {
      message.success(t('<i18nNamespace>.messages.resetPasswordSuccess'))
      // No invalidation — password isn't a visible column
    },
  })

  return {
    create, update, remove,
    // Include conditionally:
    removeMany, updateStatus, updatePassword,
  }
}
```

**Decisions to apply**:

- Drop `removeMany`, `updateStatus`, `updatePassword` based on features
- Return object: only include keys for mutations defined

**Reference**: `_example/hooks-index.ts`

---

## Step 5: i18n setup (JSON files + config wiring)

**Files** (4 file operations):

1. `src/shared/i18n/locales/en/<i18n-file>.json` (NEW)
2. `src/shared/i18n/locales/vi/<i18n-file>.json` (NEW)
3. `src/shared/i18n/resource/resource.en.ts` (PATCH — add 1 import + 1 spread line)
4. `src/shared/i18n/resource/resource.vi.ts` (PATCH — same)
5. `src/shared/i18n/types.d.ts` (PATCH — add 1 import + extend intersection)

### 5a. EN JSON template

**File**: `src/shared/i18n/locales/en/<i18n-file>.json`

```json
{
  "<i18nNamespace>": {
    "page": {
      "title": "<Entity> Management"
    },
    "table": {
      "<fieldName>": "<Field Label>"
      // ... for each table column (see decisions.md table columns)
    },
    "search": {
      "<fieldName>": "<Field Label>"
      // ... for each search field
    },
    "actions": {
      "create": "Create",
      "edit": "Edit",
      "delete": "Delete",
      "deleteSelected": "Delete {{count}} selected",
      "resetPassword": "Reset Password"
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
      "<fieldName>Placeholder": "<Hint text>",
      "<fieldName>Required": "<Field> is required",
      "<fieldName>Length": "<Field> must be A-B characters",
      "emailInvalid": "Invalid email format"
    },
    "modal": {
      "createTitle": "Create <Entity>",
      "editTitle": "Edit <Entity>",
      "discardChanges": "Discard unsaved changes?",
      "discardConfirm": "Discard",
      "loading": "Loading..."
    },
    "resetPassword": {
      "title": "Reset password for {{username}}",
      "newPassword": "New password",
      "confirmPassword": "Confirm password",
      "newPasswordPlaceholder": "4-20 characters",
      "confirmPasswordPlaceholder": "Re-enter the new password",
      "newPasswordRequired": "Please enter the new password",
      "newPasswordLength": "Password must be 4-20 characters",
      "confirmPasswordRequired": "Please confirm the password",
      "confirmPasswordMismatch": "Passwords do not match"
    }
  }
}
```

### 5b. VI JSON

Mirror structure with Vietnamese strings. See `_example/system-user.vi.json` for translation patterns.

### 5c. Config patches

**`resource.en.ts`** — add import + spread:

```typescript
import en<I18nNamespace> from '../locales/en/<i18n-file>.json'

export default {
  ...enCommon,
  // ...existing spreads...
  ...en<I18nNamespace>,
}
```

Mirror in `resource.vi.ts`.

**`types.d.ts`** — add type import + intersection:

```typescript
import type <i18nNamespace> from './locales/en/<i18n-file>.json'

type Translation =
  typeof common &
  // ...existing intersections...
  & typeof <i18nNamespace>
```

**Decisions to apply** (per decisions.md i18n section):

- Skip `messages.statusUpdateSuccess` if no statusToggle
- Skip `messages.deleteBulkSuccess` if no bulkDelete
- Skip `messages.resetPasswordSuccess` + entire `resetPassword` block if no passwordReset
- Skip `actions.deleteSelected` if no bulkDelete
- Skip `actions.resetPassword` if no passwordReset
- Skip `confirm.deleteMany` if no bulkDelete
- For each non-included form field, omit its 3 keys (label, placeholder, required, length)

**Reference**:

- `_example/system-user.en.json` + `system-user.vi.json`
- `_example/i18n-config-snippet.md` (shows where to patch resource.ts + types.d.ts)

**Verification**: `pnpm type-check` — type augmentation works (try typing `t('<i18nNamespace>.` in any file, autocomplete should suggest your keys).

---

## Step 6: Search form component

**File**: `src/features/<module>/<entity-kebab>/components/<entity-kebab>-search-form.tsx`

**Purpose**: Inline search form with N fields, submit transforms to domain shape.

**Template**:

```tsx
import { Button, DatePicker, Form, Input, Space } from 'antd'
import type { Dayjs } from 'dayjs'                                  // if has date range
import { useTranslation } from 'react-i18next'

import { DeptTreeSelect } from '@/shared/components/dept-tree-select'  // if has deptId
import { DictSelect } from '@/shared/components/dict-select'          // if has dict
import { <ENTITY>_DICT_TYPES } from '@/features/<module>/<entity-kebab>/constants'
import type { <ENTITY>Filters } from '@/features/<module>/<entity-kebab>/types'

// Form values diverge from <ENTITY>Filters for dict-typed fields:
// - DictSelect emits string; form value stays string per ADR 0004
// - RangePicker emits [Dayjs, Dayjs]; convert at submit
interface SearchFormValues {
  <field>?: <formType>     // see "DictSelect tax" + "Date range" notes
  // ...
}

interface <ENTITY>SearchFormProps {
  onSearch: (filters: <ENTITY>Filters) => void
  onReset: () => void
  loading?: boolean
}

export function <ENTITY>SearchForm({ onSearch, onReset, loading }: <ENTITY>SearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: <ENTITY>Filters = {
      <field>: values.<field>?.trim() || undefined,        // for string LIKE fields
      <dictField>: values.<dictField> == null || values.<dictField> === ''
        ? undefined
        : Number(values.<dictField>),                      // DictSelect tax: convert here
      <fkField>: values.<fkField>,                         // FK passes through
      <dateRangeField>: values.<dateRangeField>
        ? [
            values.<dateRangeField>[0].startOf('day').toISOString(),
            values.<dateRangeField>[1].endOf('day').toISOString(),
          ]
        : undefined,                                       // Range: Dayjs → ISO
    }
    onSearch(filters)
  }

  const handleReset = () => {
    form.resetFields()
    onReset()
  }

  return (
    <Form form={form} layout="inline" onFinish={handleFinish}
          style={{ marginBottom: 16, rowGap: 16, flexWrap: 'wrap' }}>

      {/* For each search field (per decisions.md ordering) */}
      <Form.Item name="<field>" label={t('<i18nNamespace>.search.<field>')}>
        <Input placeholder={t('<i18nNamespace>.search.<field>')} allowClear style={{ width: 180 }} />
      </Form.Item>

      {/* Dict-typed: NO normalize */}
      <Form.Item name="<dictField>" label={t('<i18nNamespace>.search.<dictField>')}>
        <DictSelect
          dictType={<ENTITY>_DICT_TYPES.<dictKey>}
          allowClear
          placeholder={t('<i18nNamespace>.search.<dictField>')}
          style={{ width: 140 }}
        />
      </Form.Item>

      {/* Dept FK */}
      <Form.Item name="<deptField>" label={t('<i18nNamespace>.search.<deptField>')}>
        <DeptTreeSelect
          allowClear
          placeholder={t('<i18nNamespace>.search.<deptField>')}
          style={{ width: 220 }}
        />
      </Form.Item>

      {/* Date range */}
      <Form.Item name="<dateRangeField>" label={t('<i18nNamespace>.search.<dateRangeField>')}>
        <DatePicker.RangePicker style={{ width: 260 }} />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('common.search')}
          </Button>
          <Button onClick={handleReset}>{t('common.reset')}</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
```

**Decisions to apply**:

- Field order from decisions.md (identifier → text → status → FK → date)
- `SearchFormValues.<dictField>: string` for any dict-typed filter (DictSelect tax)
- `SearchFormValues.<dateField>: [Dayjs, Dayjs]` for date ranges
- Omit search form entirely if PageReqDTO has only pagination/sort fields

**Reference**: `_example/search-form.tsx`

---

## Step 7: Modal components (form + optional reset password)

### 7a. Form modal

**File**: `src/features/<module>/<entity-kebab>/components/<entity-kebab>-form-modal.tsx`

**Purpose**: Unified create + edit modal, password conditional.

**Template** (skeleton with critical patterns; reference `_example/form-modal.tsx` for full):

```tsx
import { App, Col, Form, Input, Modal, Row, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DeptTreeSelect } from '@/shared/components/dept-tree-select'
import { DictSelect } from '@/shared/components/dict-select'
import { PostSelect } from '@/shared/components/post-select'

import { <ENTITY>_DICT_TYPES } from '../constants'
import type { <ENTITY>SaveReqDTO } from '../types'
import { use<ENTITY>DetailQuery, use<ENTITY>Mutations } from '@/features/<module>/<entity-kebab>/hooks'

interface <ENTITY>FormModalProps {
  open: boolean
  /** undefined = create, set = edit */
  id?: number
  onClose: () => void
}

interface FormValues {
  // For each SaveReqDTO field (except id, and except dict-typed numbers — those are string per ADR 0004)
  <field>: <formType>
  // password? only if create (handled conditionally in render)
}

export function <ENTITY>FormModal({ open, id, onClose }: <ENTITY>FormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = id != null

  const { create, update } = use<ENTITY>Mutations()
  const detailQuery = use<ENTITY>DetailQuery(id, { enabled: open && isEdit })

  // Populate form on edit
  useEffect(() => {
    if (!detailQuery.data) return
    const d = detailQuery.data
    form.setFieldsValue({
      <field>: d.<field>,
      // For dict-typed fields, convert number → string (DictSelect tax):
      <dictField>: d.<dictField> == null ? undefined : String(d.<dictField>),
    })
  }, [detailQuery.data, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const dto: <ENTITY>SaveReqDTO = {
      <field>: values.<field>,
      <stringField>: values.<stringField>?.trim() || undefined,
      // DictSelect tax: convert string → number for DTO
      <dictField>: values.<dictField> == null || values.<dictField> === ''
        ? undefined
        : Number(values.<dictField>),
    }

    if (isEdit) {
      await update.mutateAsync({ ...dto, id })
    } else {
      await create.mutateAsync({ ...dto, password: values.password })
    }
    onClose()
  }

  const handleCancel = () => {
    if (!form.isFieldsTouched()) { onClose(); return }
    appModal.confirm({
      title: t('<i18nNamespace>.modal.discardChanges'),
      okText: t('<i18nNamespace>.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  const showLoading = isEdit && detailQuery.isLoading
  const isSubmitting = create.isPending || update.isPending

  return (
    <Modal
      open={open}
      title={t(isEdit ? '<i18nNamespace>.modal.editTitle' : '<i18nNamespace>.modal.createTitle')}
      width={600}                                                  // adjust per decisions.md
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={isSubmitting}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnClose
      maskClosable={false}
    >
      {showLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin tip={t('<i18nNamespace>.modal.loading')} />
        </div>
      ) : (
        <Form form={form} layout="vertical" autoComplete="off">
          {/* For each field, in order from decisions.md */}
          {/* Pair short fields via Row gutter + Col span=12, long fields via Col span=24 */}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="<identifier>"
                label={t('<i18nNamespace>.form.<identifier>')}
                rules={[
                  { required: true, message: t('<i18nNamespace>.form.<identifier>Required') },
                  { min: 4, max: 30, message: t('<i18nNamespace>.form.<identifier>Length') },
                ]}
              >
                <Input
                  placeholder={t('<i18nNamespace>.form.<identifier>Placeholder')}
                  disabled={isEdit}
                />
              </Form.Item>
            </Col>
            {!isEdit && (
              <Col span={12}>
                <Form.Item
                  name="password"
                  label={t('<i18nNamespace>.form.password')}
                  rules={[
                    { required: true, message: t('<i18nNamespace>.form.passwordRequired') },
                    { min: 4, max: 20, message: t('<i18nNamespace>.form.passwordLength') },
                  ]}
                >
                  <Input.Password
                    placeholder={t('<i18nNamespace>.form.passwordPlaceholder')}
                    autoComplete="new-password"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* Continue pattern for remaining fields */}
          {/* DictSelect for sex, DeptTreeSelect for deptId, PostSelect for postIds */}
          {/* See _example/form-modal.tsx for full set */}
        </Form>
      )}
    </Modal>
  )
}
```

**Decisions to apply**:

- Field count → modal width (per decisions.md)
- 2-column Row/Col pairing per decisions.md ordering
- Skip password field entirely if no password in SaveReqDTO
- Username/identifier `disabled={isEdit}` if entity has immutable identifier

**Reference**: `_example/form-modal.tsx`

### 7b. Reset password modal (CONDITIONAL — only if features.passwordReset)

**File**: `src/features/<module>/<entity-kebab>/components/<entity-kebab>-reset-password-modal.tsx`

**Skip entirely** if `features.passwordReset: false`.

**Template**: see `_example/reset-password-modal.tsx`. Key patterns:

- Vertical layout, width 420
- 2 password fields with `dependencies={['newPassword']}` on confirm validator
- Accepts `user: <ENTITY>RespDTO | null` prop (not just id — need username for title)
- No detail fetch (`useQuery` not needed)
- No list invalidation on success

---

## Step 8: List page component

**File**: `src/features/<module>/<entity-kebab>/pages/<entity-kebab>-list-page.tsx`

**Purpose**: Orchestrating page component. Composes everything above.

**Template skeleton** (full reference: `_example/list-page.tsx`):

```tsx
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Card, Space, Switch, Table, Tooltip, type TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { selectUser } from '@/app/slices/auth-slice'   // if selfProtection
import { useAppSelector } from '@/app/store'           // if selfProtection
import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'
import type { SortParams } from '@/shared/types/api'   // if sortable

import { <entity>Api } from '../api'
import { <ENTITY>_DICT_TYPES, <ENTITY>_PERMISSIONS, <ENTITY>Status } from '../constants'
import type { <ENTITY>Filters, <ENTITY>RespDTO } from '../types'
import { <ENTITY>SearchForm } from '../components/<entity-kebab>-search-form'
import { <ENTITY>FormModal } from '../components/<entity-kebab>-form-modal'
import { <ENTITY>ResetPasswordModal } from '../components/<entity-kebab>-reset-password-modal'  // if passwordReset
import { sys<ENTITY>QueryKey, use<ENTITY>Mutations } from '../hooks'

// Initial sort (skip if not sortable):
const INITIAL_SORT: SortParams = { field: 'createTime', order: 'desc' }

export function <ENTITY>ListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const currentUser = useAppSelector(selectUser)   // if selfProtection

  const tableState = useTableState<<ENTITY>Filters>(
    {},
    INITIAL_SORT,  // omit if not sortable
  )
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{ open: boolean; id?: number }>({ open: false })
  const [resetPwdModal, setResetPwdModal] = useState<{    // if passwordReset
    open: boolean
    user: <ENTITY>RespDTO | null
  }>({ open: false, user: null })
  const [searchVisible, setSearchVisible] = useState(true)

  const { tableProps, refetch } = usePagedQuery<<ENTITY>RespDTO, <ENTITY>Filters>({
    baseQueryKey: sys<ENTITY>QueryKey.all,
    queryFn: <entity>Api.page,
    tableState,
  })

  const { remove, removeMany, updateStatus } = use<ENTITY>Mutations()
  //                ^^^^^^^^^^                ^^^^^^^^^^^^
  //         if bulkDelete                if statusToggle

  // Helpers
  const isSelf = (record: <ENTITY>RespDTO) => record.id === currentUser?.id  // if selfProtection

  // Handlers
  const handleCreate = () => setFormModal({ open: true })
  const handleEdit = (record: <ENTITY>RespDTO) => setFormModal({ open: true, id: record.id })
  const handleResetPassword = (record: <ENTITY>RespDTO) =>                   // if passwordReset
    setResetPwdModal({ open: true, user: record })

  const handleDeleteOne = (record: <ENTITY>RespDTO) => {
    modal.confirm({
      title: t('<i18nNamespace>.confirm.deleteOne', { name: record.<displayField> }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const handleDeleteBulk = () => {                                            // if bulkDelete
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('<i18nNamespace>.confirm.deleteMany', { count: selectedRowKeys.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeMany.mutateAsync(selectedRowKeys)
        setSelectedRowKeys([])
      },
    })
  }

  const handleStatusToggle = (record: <ENTITY>RespDTO, checked: boolean) => {  // if statusToggle
    const newStatus = checked ? <ENTITY>Status.ENABLED : <ENTITY>Status.DISABLED
    updateStatus.mutate({ id: record.id, status: newStatus })
  }

  // Columns — see _example/list-page.tsx + decisions.md table section
  const columns: TableColumnsType<<ENTITY>RespDTO> = [ /* ... */ ]

  return (
    <Card>
      {/* Animated search form (per T2.5) */}
      <div style={{
        overflow: 'hidden',
        transition: 'max-height 300ms ease, opacity 200ms ease, margin-bottom 300ms ease',
        maxHeight: searchVisible ? 600 : 0,
        opacity: searchVisible ? 1 : 0,
        marginBottom: searchVisible ? 16 : 0,
      }}>
        <<ENTITY>SearchForm
          loading={tableProps.loading}
          onSearch={filters => { setSelectedRowKeys([]); tableState.setFilters(filters) }}
          onReset={() => { setSelectedRowKeys([]); tableState.clearFilters() }}
        />
      </div>

      {/* Toolbar: primary left + utility right */}
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <HasPermission code={<ENTITY>_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('<i18nNamespace>.actions.create')}
            </Button>
          </HasPermission>
          {/* if bulkDelete: */}
          <HasPermission code={<ENTITY>_PERMISSIONS.delete}>
            <Button danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}>
              {t('<i18nNamespace>.actions.deleteSelected', { count: selectedRowKeys.length })}
            </Button>
          </HasPermission>
        </Space>
        <Space>
          <Tooltip title={searchVisible ? t('common.hideSearch') : t('common.showSearch')}>
            <Button icon={<SearchOutlined />} type={searchVisible ? 'default' : 'primary'}
              onClick={() => setSearchVisible(v => !v)} />
          </Tooltip>
          <Tooltip title={t('common.refresh')}>
            <Button icon={<ReloadOutlined />} loading={tableProps.loading} onClick={() => refetch()} />
          </Tooltip>
        </Space>
      </Space>

      <Table<<ENTITY>RespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{                                                         // if bulkDelete
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
          getCheckboxProps: record => ({ disabled: isSelf(record) }),           // if selfProtection
        }}
      />

      <<ENTITY>FormModal
        open={formModal.open}
        id={formModal.id}
        onClose={() => setFormModal({ open: false })}
      />
      {/* if passwordReset: */}
      <<ENTITY>ResetPasswordModal
        open={resetPwdModal.open}
        user={resetPwdModal.user}
        onClose={() => setResetPwdModal({ open: false, user: null })}
      />
    </Card>
  )
}
```

**Decisions to apply**: see comments above for each conditional block. Match to features map.

**Reference**: `_example/list-page.tsx` (full implementation).

---

## Step 9: Page wrapper (thin re-export)

**File**: `src/pages/<module>/<entity-kebab>/index.tsx`

**Purpose**: Connect feature to `import.meta.glob` dispatcher.

**Template** (trivially small):

```tsx
import { <ENTITY>ListPage } from '@/features/<module>/<entity-kebab>/pages/<entity-kebab>-list-page'

export default function <MODULE><ENTITY>Page() {
  return <<ENTITY>ListPage />
}
```

**Verification**:

- File path matches BE's `system_menu.component` (e.g., `system/role/index` → `src/pages/system/role/index.tsx`)
- `pnpm type-check` passes
- Login → click menu in sider → tab opens → page renders

---

## Post-build verification

After all 9 steps:

```bash
pnpm type-check
pnpm lint
```

Both should pass cleanly. Common failures + fixes:

| Error                                             | Fix                                                        |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `Cannot find module '@/features/.../api'`         | Step 3 not done, file path typo                            |
| i18n key autocomplete missing                     | Step 5c (types.d.ts) skipped                               |
| `Property 'X' does not exist on type 'Y'` in form | DictSelect tax — check string↔number conversions           |
| `useTranslation` returns key as-is                | Step 5a/5b JSON file syntax error or missing namespace key |
| Permission code "denied" for super_admin          | Permission code typo vs BE seed                            |

If `type-check` passes but page is blank when navigating, check:

- BE menu seed: `SELECT * FROM system_menu WHERE tab_key = '<your-tab-key>'`
- `import.meta.glob` resolution: file path must EXACTLY match `system_menu.component`

---

## Smoke test (hand off to human)

Agent should NOT smoke-test (no running BE). Instead, summarize for human:

```markdown
## CRUD page built: <Entity>

Files created:

- src/features/<module>/<entity-kebab>/types.ts
- src/features/<module>/<entity-kebab>/constants.ts
- ...

Features included:

- Bulk delete: YES
- Status toggle: YES
- Reset password: YES
- Self-protection: YES (entity is user-like)

Decisions made (with reasoning):

- Modal width: 600 (9 form fields)
- Initial sort: createTime DESC (sortable + has createTime)
- ...

Open questions for human review:

- Field "X" has unclear dict type — guessed `dict_Y`, please verify
- Custom endpoint `/foo` in BE controller — excluded as out-of-scope; review if needed
- ...

Type-check + lint: PASSED

Suggested smoke test sequence:

- Login → click <Module> > <Entity> in sider
- Search by <identifier>
- Create new <entity>
- Edit existing <entity>
- Delete single + bulk
- (if passwordReset) reset password for a user
- (if statusToggle) toggle status
- (if selfProtection) verify own row protected
- F5 → state resets
- Switch tab away + back → state preserved
- Verify i18n by switching language
```

Human runs smoke; bugs surface; iterate.

---

## Quick step-by-step recap

```
1. types.ts         (TS DTOs + filters + page params)
2. constants.ts     (PERMISSIONS + DICT_TYPES + enum mirrors)
3. api/index.ts     (HTTP methods, Phase 5A unwrap)
4. hooks/index.ts   (query keys + queries + mutations)
5. i18n             (en + vi JSONs + resource.ts + types.d.ts patches)
6. search-form.tsx  (inline form, dict-tax conversions)
7. form-modal.tsx + (optional) reset-password-modal.tsx
8. list-page.tsx    (orchestrator)
9. pages/.../index.tsx (thin wrapper)
```

End of build. Hand off to human.
