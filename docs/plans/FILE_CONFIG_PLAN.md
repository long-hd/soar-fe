# File Config FE — Block Plan

> **Status**: All design Qs locked from `FILE_CONFIG_PREP.md`. Read after `BE_FILE_MICRO_PATCH.md` ships + smoke pass.
>
> **Block scope**: `/infra/file-config` only (CRUD + Test + SetMaster + bulk delete).
> File list (`/infra/file`) defer block sau.
>
> **Checkpoint plan**: 2 checkpoints. CP1 = API + types + hooks + list page; CP2 = form modal + actions + smoke.

---

## 1. Locked decisions (recap)

| Q                              | Choice                                  | Rationale                                                 |
| ------------------------------ | --------------------------------------- | --------------------------------------------------------- |
| Q1 — scope                     | A: chỉ file-config                      | Conditional form + 2 actions đã đủ complexity cho 1 block |
| Q2 — load detail               | A: BE `/get` endpoint (qua micro-patch) | Pattern parity; avoid stale-data + coupling               |
| Q3 — bulk delete               | B: BE `delete-list` (qua micro-patch)   | Pattern parity; consistent UX                             |
| Q4 — conditional form          | A: shouldUpdate + render-prop           | Parity với TM 3-way discriminator                         |
| Q5 — storage immutable on edit | A: disabled khi edit                    | 5th instance code-immutability pattern                    |
| Q6 — submit-gate               | A: strip config fields ngoài storage    | Defensive, parity với RDS pattern                         |
| Q7 — Test UX                   | B: notification với "Open" link         | Đơn giản hơn confirm dialog của yudao                     |
| Q8 — folder names              | kebab everywhere                        | BE seed migrate-able; consistency win                     |
| Q9 — i18n                      | A: separate `infra-file-config.json`    | Parity per-feature namespace                              |
| Q10 — checkpoints              | A: 2 checkpoints                        | Pattern mature, agent có thể CP1 in 1 pass                |

---

## 2. File structure (new files only)

```
soar-fe/src/
├── features/infra/file-config/                    [NEW]
│   ├── api/
│   │   └── index.ts                                [NEW]
│   ├── components/
│   │   └── file-config-form-modal.tsx              [NEW]
│   │   └── file-config-search-form.tsx             [NEW]
│   ├── hooks/
│   │   └── index.ts                                [NEW]
│   ├── pages/
│   │   └── file-config-list-page.tsx               [NEW]
│   ├── constants.ts                                [NEW]
│   └── types.ts                                    [NEW]
├── pages/infra/file-config/                       [NEW]
│   └── index.tsx                                   [NEW] (re-export from features)
└── shared/
    ├── lib/format.ts                              [EDIT — add formatBytes]
    └── i18n/locales/{en,vi}/infra-file-config.json [NEW]
```

> Note: `src/pages/infra/file-config/index.tsx` đường dẫn MUST match BE seed sau migration patch.
> Verify migration đã chạy + `system_menu.component` = `infra/file-config/index` trước khi smoke.

---

## 3. Types (`types.ts`)

```ts
/**
 * File Config module TypeScript types — mirror of BE DTOs:
 *   soar-module-infra/.../file/dto/config/*.java
 */

import type { PageParam } from '@/shared/api/types'

// ===== Storage-specific config shapes (matches BE FileClientConfig variants) =====

export interface DBFileClientConfig {
  domain?: string
}

export interface LocalFileClientConfig {
  basePath: string
  domain?: string
}

export interface S3FileClientConfig {
  endpoint: string
  bucket: string
  accessKey: string
  accessSecret: string
  enablePathStyleAccess: boolean
  enablePublicAccess: boolean
  region?: string
  domain?: string
}

/** Union — discriminated by `storage` field on the parent DTO. */
export type FileClientConfig = DBFileClientConfig | LocalFileClientConfig | S3FileClientConfig

// ===== Response =====

export interface FileConfigRespDTO {
  id: number
  name: string
  storage: number
  master: boolean
  config: Record<string, unknown> // BE returns Map<String, Object>; cast khi consume
  remark?: string
  createTime: string
}

// ===== Request — Create + Update (unified) =====

export interface FileConfigSaveReqDTO {
  id?: number
  name: string
  storage: number
  config: Record<string, unknown> // raw map — agent should strip via submit-gate (Q6)
  remark?: string
}

// ===== Search filters =====

export interface FileConfigFilters extends Record<string, unknown> {
  name?: string
  storage?: number
  createTime?: [string, string]
}

export type FileConfigPageReqParams = PageParam & FileConfigFilters
```

---

## 4. Constants (`constants.ts`)

```ts
// ===== Permission codes =====

export const FILE_CONFIG_PERMISSIONS = {
  query: 'infra:file-config:query',
  create: 'infra:file-config:create',
  update: 'infra:file-config:update',
  delete: 'infra:file-config:delete',
} as const

// ===== Dict types =====

export const FILE_CONFIG_DICT_TYPES = {
  storage: 'infra_file_storage',
} as const

// ===== Storage enum values (BE source of truth) =====

/** Matches BE FileStorageEnum. */
export const FILE_STORAGE = {
  DB: 1,
  LOCAL: 10,
  S3: 20,
} as const

export type FileStorageValue = (typeof FILE_STORAGE)[keyof typeof FILE_STORAGE]

/** Which config fields belong to which storage type — used by submit-gate (Q6). */
export const STORAGE_CONFIG_FIELDS: Record<FileStorageValue, readonly string[]> = {
  [FILE_STORAGE.DB]: ['domain'],
  [FILE_STORAGE.LOCAL]: ['basePath', 'domain'],
  [FILE_STORAGE.S3]: [
    'endpoint',
    'bucket',
    'accessKey',
    'accessSecret',
    'enablePathStyleAccess',
    'enablePublicAccess',
    'region',
    'domain',
  ],
} as const
```

---

## 5. API (`api/index.ts`)

Pattern parity với `roleApi`. Spec:

```ts
import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type { FileConfigPageReqParams, FileConfigRespDTO, FileConfigSaveReqDTO } from '../types'

const BASE = '/admin-api/infra/file-config'

export const fileConfigApi = {
  page(params: FileConfigPageReqParams): Promise<PageResult<FileConfigRespDTO>> {
    return request
      .get<CommonResult<PageResult<FileConfigRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<FileConfigRespDTO> {
    return request
      .get<CommonResult<FileConfigRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: FileConfigSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: FileConfigSaveReqDTO): Promise<boolean> {
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

  updateMaster(id: number): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${BASE}/update-master`, null, { params: { id } })
      .then(r => r.data.data)
  },

  test(id: number): Promise<string> {
    return request
      .get<CommonResult<string>>(`${BASE}/test`, { params: { id } })
      .then(r => r.data.data)
  },
}
```

---

## 6. Hooks (`hooks/index.ts`)

Pattern parity với `useRoleMutations`. Mutations:

- `create`, `update`, `remove`, `removeMany` (standard CRUD)
- `updateMaster` (new — confirms success + invalidates list)
- `test` (new — different — returns URL string, KHÔNG invalidate, KHÔNG message toast inside hook; caller handle UX qua Q7 notification pattern)

```ts
// Pseudo-spec — agent reads role hooks for exact form
export const fileConfigQueryKey = ['infra', 'file-config'] as const

export const fileConfigKey = {
  all: fileConfigQueryKey,
  detail: (id: number) => [...fileConfigQueryKey, 'detail', id] as const,
}

export function useFileConfigDetailQuery(id, options) {
  /* ... */
}

export function useFileConfigMutations() {
  // standard: create, update, remove, removeMany, updateMaster
  // NOT included: test — that's not really a mutation; just a one-shot call.
  // Caller in list page does: const url = await fileConfigApi.test(id); notification.success({...})
}
```

> ⚠️ Decision: `test` không nên là `useMutation` vì:
>
> - Không mutate state
> - UX flow của Q7 cần caller control notification timing
> - Pattern: ADR 0005 "mutations no callback" — caller chain handler. Cùng logic áp dụng cho non-mutation calls.
>
> Agent: caller dùng `useState<boolean>` cho `testingId` để show button loading; gọi `fileConfigApi.test(id)` trực tiếp.

---

## 7. List page (`file-config-list-page.tsx`)

### Search form

Inputs:

- `name` (Input — fuzzy)
- `storage` (DictSelect with `infra_file_storage`)
- `createTime` (DatePicker range)

Pattern parity với `RoleSearchForm`.

### Table columns

| Column      | dataIndex  | Render                                                  |
| ----------- | ---------- | ------------------------------------------------------- |
| ID          | id         | (none)                                                  |
| Config Name | name       | (none)                                                  |
| Storage     | storage    | `<DictTag dictType="infra_file_storage" value={...} />` |
| Master      | master     | `<Tag color={...}>` Yes/No (use i18n)                   |
| Remark      | remark     | text                                                    |
| Created     | createTime | `formatDateTime(...)`                                   |
| Actions     | (computed) | Edit / SetMaster / Test / Delete                        |

### Header bar

- "+ Create" button (gated `infra:file-config:create`)
- "Bulk Delete" button — disabled when `selectedRowKeys.length === 0`, gated `infra:file-config:delete`
- "Refresh" + "Search toggle" (parity với role-list-page)

### Row actions

```
Edit | SetMaster (disabled if record.master) | Test | Delete
```

All gated qua `HasPermission`. SetMaster only shows if `update` permission.

**SetMaster confirm**: `modal.confirm({ title: t('confirm.setMaster', { name: record.name }), ... })`.

**Test action**: see "Test action UX" section below.

**Delete confirm**: standard `modal.confirm` — BE returns error if master; FE just propagates message.

### Row selection

Checkbox column for bulk delete. Master row CAN be selected (BE will reject the batch; FE error message will surface). Alternative: pre-filter checkbox `getCheckboxProps={(record) => ({ disabled: record.master })}` — Claude rec **pre-filter** to give better UX.

### Test action UX (Q7 vote B)

```tsx
const [testingId, setTestingId] = useState<number | null>(null)
const { notification } = App.useApp()

const handleTest = async (record: FileConfigRespDTO) => {
  setTestingId(record.id)
  try {
    const url = await fileConfigApi.test(record.id)
    notification.success({
      message: t('infraFileConfig.test.success'),
      description: (
        <a href={url} target="_blank" rel="noreferrer">
          {t('infraFileConfig.test.openLink')}
        </a>
      ),
      duration: 10,
    })
  } catch (err) {
    // global error interceptor handles message — no extra notification
    throw err
  } finally {
    setTestingId(null)
  }
}

// In actions column:
;<Button
  type="link"
  size="small"
  loading={testingId === record.id}
  onClick={() => handleTest(record)}
>
  {t('infraFileConfig.actions.test')}
</Button>
```

---

## 8. Form modal (`file-config-form-modal.tsx`)

Standard antd Form modal — uses Form lifecycle pattern (reset → populate → preset), NOT
draft pattern (this has form fields, not just selection — Form lifecycle is correct here).

### Lifecycle (parity với RoleFormModal)

```tsx
useEffect(() => {
  if (!open) return
  form.resetFields()
  if (configId && detail) {
    form.setFieldsValue(buildFormValues(detail))
  }
}, [open, configId, detail])
```

`detail` from `useFileConfigDetailQuery(configId, { enabled: open && configId != null })`.

### Form fields

| Field      | Component      | Notes                                                           |
| ---------- | -------------- | --------------------------------------------------------------- |
| `name`     | Input          | Required, max 63                                                |
| `remark`   | Input.TextArea | Optional                                                        |
| `storage`  | DictSelect     | Required; **disabled khi edit** (Q5 — code immutability)        |
| `config.*` | Conditional    | Render per storage value qua `<Form.Item shouldUpdate noStyle>` |

### Conditional render pattern (Q4 — shouldUpdate + render-prop)

```tsx
<Form.Item noStyle shouldUpdate={(prev, curr) => prev.storage !== curr.storage}>
  {({ getFieldValue }) => {
    const storage = getFieldValue('storage') as FileStorageValue | undefined
    if (storage == null) return null

    if (storage === FILE_STORAGE.DB) {
      return <DomainField />
    }
    if (storage === FILE_STORAGE.LOCAL) {
      return (
        <>
          <BasePathField />
          <DomainField />
        </>
      )
    }
    if (storage === FILE_STORAGE.S3) {
      return (
        <>
          <Form.Item name={['config', 'endpoint']} label={t('...')} rules={[{ required: true }]}>
            <Input placeholder="http://localhost:8333" />
          </Form.Item>
          <Form.Item name={['config', 'bucket']} ...>
          <Form.Item name={['config', 'accessKey']} ...>
          <Form.Item name={['config', 'accessSecret']} ...>
            <Input.Password />
          </Form.Item>
          <Form.Item name={['config', 'enablePathStyleAccess']} label={...} rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={true}>{t('common.enabled')}</Radio>
              <Radio value={false}>{t('common.disabled')}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name={['config', 'enablePublicAccess']} ...>
            {/* same Radio.Group pattern */}
          </Form.Item>
          <Form.Item name={['config', 'region']} label={...}>
            <Input placeholder="us-east-1" />
          </Form.Item>
          <DomainField />
        </>
      )
    }
    return null
  }}
</Form.Item>
```

`<DomainField />` is a small inline functional component or just inlined — Form.Item with
`name={['config', 'domain']}`, label "Custom Domain", optional, URL pattern validation.

### Default values for S3

When user picks S3 from dropdown, prefill `region: 'us-east-1'`, `enablePathStyleAccess: true`,
`enablePublicAccess: true` (sensible defaults for SeaweedFS).

Implementation: listen to storage change qua `onValuesChange` → set defaults nếu chuyển sang S3 + chưa có value.

```tsx
const handleValuesChange = (changed, _all) => {
  if ('storage' in changed && changed.storage === FILE_STORAGE.S3) {
    form.setFieldsValue({
      config: {
        region: 'us-east-1',
        enablePathStyleAccess: true,
        enablePublicAccess: true,
      },
    })
  }
}
```

### Submit-gate (Q6 vote A)

Before calling create/update mutation:

```tsx
const handleSubmit = async () => {
  const values = await form.validateFields()
  const storage = values.storage as FileStorageValue
  const allowedFields = STORAGE_CONFIG_FIELDS[storage]
  const cleanConfig: Record<string, unknown> = {}
  for (const key of allowedFields) {
    const val = values.config?.[key]
    // Skip undefined; keep null/false/empty string IF the field is required (BE will reject empty)
    if (val !== undefined) {
      cleanConfig[key] = val
    }
  }
  const payload: FileConfigSaveReqDTO = {
    ...(values.id != null && { id: values.id }),
    name: values.name,
    storage,
    config: cleanConfig,
    remark: values.remark,
  }
  if (configId) {
    await update.mutateAsync(payload)
  } else {
    await create.mutateAsync(payload)
  }
  onClose()
}
```

This prevents leftover S3 fields polluting a LOCAL config (or vice versa) when user
switches storage mid-edit. Parity với RDS submit-gate.

### Modal size

`width={640}` static. Vertical layout (`layout="vertical"`). `mask={{ closable: false }}`.
`destroyOnHidden`.

---

## 9. i18n keys (`infra-file-config.json`)

Structure (Long polish translations):

```json
{
  "infraFileConfig": {
    "title": "File Configuration",
    "table": {
      "name": "Config Name",
      "storage": "Storage Type",
      "master": "Master",
      "remark": "Remark",
      "createTime": "Created At"
    },
    "form": {
      "name": "Config Name",
      "namePlaceholder": "Enter a recognizable name",
      "storage": "Storage Type",
      "remark": "Remark",
      "basePath": "Base Path",
      "basePathPlaceholder": "e.g. /tmp/soar-files",
      "endpoint": "Endpoint URL",
      "endpointPlaceholder": "e.g. http://localhost:8333",
      "bucket": "Bucket",
      "accessKey": "Access Key",
      "accessSecret": "Secret Key",
      "enablePathStyleAccess": "Path-style URLs",
      "enablePublicAccess": "Public Access",
      "publicLabel": "Public",
      "privateLabel": "Private (presigned URLs)",
      "region": "Region",
      "regionPlaceholder": "Optional, e.g. us-east-1",
      "domain": "Custom Domain"
    },
    "actions": {
      "edit": "Edit",
      "delete": "Delete",
      "setMaster": "Set as Master",
      "test": "Test"
    },
    "confirm": {
      "deleteOne": "Delete config \"{{name}}\"?",
      "deleteMany": "Delete {{count}} configs?",
      "setMaster": "Set \"{{name}}\" as the master config?"
    },
    "test": {
      "success": "Test upload succeeded",
      "openLink": "Open the uploaded file"
    },
    "messages": {
      "createSuccess": "Config created",
      "updateSuccess": "Config updated",
      "deleteSuccess": "Config deleted",
      "deleteBulkSuccess": "{{count}} configs deleted",
      "setMasterSuccess": "Master config updated"
    },
    "validation": {
      "nameRequired": "Config name is required",
      "storageRequired": "Storage type is required",
      "basePathRequired": "Base path is required",
      "endpointRequired": "Endpoint URL is required",
      "bucketRequired": "Bucket is required",
      "accessKeyRequired": "Access Key is required",
      "accessSecretRequired": "Secret Key is required"
    }
  }
}
```

Long fill VI version từ EN.

---

## 10. Smoke checklist (after CP2)

### Visual / nav

- [ ] Login → sidebar shows "File Management" parent với child "File Config"
- [ ] Click "File Config" → URL `/?tab=infra-file-config`, list page renders
- [ ] Search by name + storage works
- [ ] Date range filter works

### CRUD — LOCAL

- [ ] Create new LOCAL config với basePath `/tmp/soar-test` → success
- [ ] Edit existing LOCAL config → modal pre-filled, storage dropdown disabled
- [ ] Form change basePath → save → table refreshes

### CRUD — S3 (SeaweedFS)

- [ ] Create new S3 config với endpoint `http://localhost:8333`, bucket `soar-files`,
      accessKey + secret from `s3.json`, pathStyle=true, public=true → success
- [ ] Test action → notification với "Open" link → click → browser opens uploaded sample image
- [ ] Edit S3 config → form pre-filled, storage disabled
- [ ] Switch storage trong form (create mode): chọn S3 → fill → đổi LOCAL → submit → BE receives chỉ LOCAL fields (verify in BE logs hoặc DB inspect)

### Master + Delete

- [ ] SetMaster non-master config → confirm → success → previous master loses status
- [ ] Try delete master → error message surfaces (BE rejects)
- [ ] Delete non-master → confirm → success
- [ ] Bulk delete 2 non-master configs → success
- [ ] Bulk delete batch includes master → entire batch rejected (verify selection UX prevents this)

### Edge cases

- [ ] Refresh list after create returns from BE — new row appears at top (or wherever sort puts it)
- [ ] Master toggle pre-disabled in row actions (record.master = true)
- [ ] Storage dropdown disabled on edit (not just visual — try clicking)
- [ ] Permission gating: log in as user without `infra:file-config:create` → "+ Create" button hidden
- [ ] No console errors / warnings

---

## 11. Definition of Done

- [ ] All 5 new feature files + 1 page file + 2 i18n files created
- [ ] `formatBytes` utility added to `src/shared/lib/format.ts` (will be used by file list block next)
- [ ] No ESLint errors, no TS errors
- [ ] All smoke items pass
- [ ] No console errors during normal use
- [ ] Tab key works: navigate to `/?tab=infra-file-config` directly via URL
- [ ] Code immutability pattern reinforced (storage field — 5th instance)
- [ ] Form pattern (Form lifecycle, NOT draft) used appropriately
- [ ] Submit-gate working (BE receives clean config map)

---

## 12. Checkpoint structure

### Checkpoint 1 — Foundation + list page

Agent delivers:

- `types.ts`, `constants.ts`, `api/index.ts`, `hooks/index.ts`
- `pages/file-config-list-page.tsx` (full list page with table + search + header bar + row actions WITHOUT modal hookup)
- `components/file-config-search-form.tsx`
- `src/pages/infra/file-config/index.tsx` (re-export)
- i18n keys (EN at minimum; VI can be EN-mirrored placeholder)
- `formatBytes` in `shared/lib/format.ts`

Skip in CP1: form modal (placeholder import + commented hook usage OK).

**Claude reviews**:

- Hook API usage (`usePermission` → `{ has }` not `{ hasPermission }`)
- Permission codes match constants
- TanStack Query keys structured correctly
- DictSelect tax compliance
- Mutations no callback (ADR 0005)
- All TypeScript types match BE DTOs
- formatBytes signature usable by both this + file list block

### Checkpoint 2 — Form modal + actions + smoke prep

Agent delivers:

- `components/file-config-form-modal.tsx` (full conditional form)
- List page actions wired: Edit modal trigger, SetMaster confirm, Test notification, Delete confirm, bulk delete
- Pre-disabled checkbox for master rows
- Storage default-values logic on storage change
- Submit-gate implementation

**Claude reviews**:

- Form lifecycle (reset → populate → preset) correct
- shouldUpdate + render-prop conditional pattern matches spec
- Storage field disabled on edit
- Submit-gate strips correctly (verify with mental walkthrough: S3→LOCAL→submit scenario)
- S3 defaults set on storage change
- Test loading state per-row (not global)
- All confirms use proper i18n keys
- Master pre-disabled in checkbox selection
- destroyOnHidden + mask non-closable on Modal
- No console errors during walkthrough

### Smoke (after CP2 ship)

Long runs through section 10 checklist.

---

## 13. Open risks

1. **BE config field validation**: BE service deserializes Map → S3FileClientConfig via Jackson. If Jackson configured strict (`@JsonIgnoreProperties(ignoreUnknown=false)`), our submit-gate is required. If lenient, submit-gate is defensive. Agent should verify trong CP1: grep `ObjectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)`. Either way submit-gate is keepable.

2. **`master` field in form values**: BE doesn't accept `master` in `FileConfigSaveReqDTO` — that's separate endpoint. Form must NOT include `master` field. Agent ensure exclusion.

3. **Hibernate validator on S3 `enablePathStyleAccess` / `enablePublicAccess`**: Both are `@NotNull Boolean`. Form Radio with `value={true|false}` works; Radio with string `'true'|'false'` would fail BE validation. Agent ensure boolean primitive `value={true}` / `value={false}` in Radio.

4. **i18n placeholders not yet final**: ship reasonable English, Long polish post-smoke.
