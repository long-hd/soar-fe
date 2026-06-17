# File List + Upload FE — Block Plan

> Pattern foundation đã established (file-config block). Block này thêm: Upload modal, clipboard utility, image/PDF preview. Plus side-task: **TD-FE-6** (file-config LOCAL/DB domain validation).
>
> **Checkpoint plan**: 2 checkpoints. CP1 = foundation + list page + actions. CP2 = upload modal + TD-FE-6 fix.

---

## 1. Locked decisions (recap from PREP)

| Q                   | Choice                                               | Note                             |
| ------------------- | ---------------------------------------------------- | -------------------------------- |
| Q1 — upload mode    | A: Mode 1 (multipart) only                           | Mode 2 deferred — see §13 Future |
| Q2 — multi-file     | B: multi-file batch                                  | antd Upload native support       |
| Q3 — accepted types | A: any type                                          | Admin trusted                    |
| Q4 — UI shape       | B: Upload button → modal với Dragger                 |                                  |
| Q5 — preview        | C: antd `<Image preview>` + PDF link + Download link |                                  |
| Q6 — clipboard      | A: `copyToClipboard` utility shared                  |                                  |
| Q7 — filters        | A: name + type + createTime (skip path)              |                                  |
| Q8 — TD-FE-6        | B+C: required + URL format + helper text             | Side-task                        |
| Q9 — progress       | A: antd default per-file                             |                                  |
| Q10 — bulk delete   | A: enabled                                           |                                  |
| Q11 — pre-flight    | B: let BE error surface                              | Deferred — see §13 Future        |
| Q12 — checkpoints   | A: 2 checkpoints                                     |                                  |

---

## 2. File structure

```
soar-fe/src/
├── features/infra/file/                          [NEW]
│   ├── api/
│   │   └── index.ts                               [NEW]
│   ├── components/
│   │   ├── file-search-form.tsx                   [NEW]
│   │   └── file-upload-modal.tsx                  [NEW]
│   ├── hooks/
│   │   └── index.ts                               [NEW]
│   ├── pages/
│   │   └── file-list-page.tsx                    [NEW]
│   ├── constants.ts                               [NEW]
│   └── types.ts                                   [NEW]
├── pages/infra/file/                             [NEW]
│   └── index.tsx                                  [NEW] (re-export)
├── shared/lib/
│   └── clipboard.ts                              [NEW]
└── shared/i18n/locales/{en,vi}/infra-file.json   [NEW]
```

Plus **TD-FE-6 edits**:

```
soar-fe/src/features/infra/file-config/
├── components/file-config-form-modal.tsx          [EDIT — add domain validation]
└── (i18n) infra-file-config.json (en+vi)          [EDIT — add domainRequired, domainHelp keys]
```

---

## 3. Types (`types.ts`)

```ts
/**
 * File module TypeScript types — mirror of BE DTOs:
 *   soar-module-infra/.../file/dto/file/*.java
 */

import type { PageParam } from '@/shared/api/types'

// ===== Response =====

export interface FileRespDTO {
  id: number
  configId: number
  name: string
  path: string
  url: string
  type: string
  size: number
  createTime: string
}

// ===== Search filters =====

export interface FileFilters extends Record<string, unknown> {
  name?: string
  type?: string
  createTime?: [string, string]
}

export type FilePageReqParams = PageParam & FileFilters
```

---

## 4. Constants (`constants.ts`)

```ts
export const FILE_PERMISSIONS = {
  query: 'infra:file:query',
  create: 'infra:file:create',
  delete: 'infra:file:delete',
} as const

// MIME type categorization for preview rendering
export const PREVIEWABLE_IMAGE_PREFIX = 'image/'
export const PREVIEWABLE_PDF_TYPE = 'application/pdf'
```

---

## 5. API (`api/index.ts`)

```ts
import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type { FilePageReqParams, FileRespDTO } from '../types'

const BASE = '/admin-api/infra/file'

export const fileApi = {
  page(params: FilePageReqParams): Promise<PageResult<FileRespDTO>> {
    return request
      .get<CommonResult<PageResult<FileRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
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

  /**
   * Mode 1 multipart upload.
   * @returns The uploaded file's access URL (BE returns String, not the full FilePO)
   */
  upload(
    file: File,
    directory?: string,
    onUploadProgress?: (e: ProgressEvent) => void,
  ): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    if (directory) formData.append('directory', directory)
    return request
      .post<CommonResult<string>>(`${BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      })
      .then(r => r.data.data)
  },
}
```

**Note**: BE `/upload` returns `CommonResult<String>` — the access URL of uploaded file. NOT the FilePO. List query refetch after upload picks up the new row.

---

## 6. Hooks (`hooks/index.ts`)

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { fileApi } from '@/features/infra/file/api'

export const fileQueryKey = ['infra', 'file'] as const

export const fileKey = {
  all: fileQueryKey,
}

export function useFileMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: fileQueryKey })

  const remove = useMutation({
    mutationFn: (id: number) => fileApi.delete(id),
    onSuccess: () => {
      message.success(t('infraFile.messages.deleteSuccess'))
      void invalidateList()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => fileApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('infraFile.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateList()
    },
  })

  // NOT included: upload — uses antd Upload customRequest pattern, called directly
  // from upload modal. Caller invalidates list on success.

  return { remove, removeMany }
}
```

Note: **upload không phải mutation** — antd Upload component dùng `customRequest` callback. Modal sẽ call `fileApi.upload(file, undefined, onProgress)` trực tiếp; on success → `queryClient.invalidateQueries({ queryKey: fileQueryKey })`.

---

## 7. Clipboard utility (`shared/lib/clipboard.ts`)

```ts
/**
 * Copy text to clipboard. Uses navigator.clipboard in secure contexts (HTTPS, localhost);
 * falls back to legacy execCommand for plain HTTP non-localhost.
 *
 * @returns true if copy succeeded, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback for non-secure contexts
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
```

---

## 8. List page (`file-list-page.tsx`)

### Search form

Inputs:

- `name` (Input — fuzzy)
- `type` (Input — fuzzy on MIME type, e.g. `image` matches all images)
- `createTime` (DatePicker range)

Pattern parity với file-config-search-form.

### Table columns

| Column   | dataIndex  | Render                                                 | Notes               |
| -------- | ---------- | ------------------------------------------------------ | ------------------- |
| Name     | name       | text với `<Typography.Text ellipsis copyable={false}>` | Truncate long names |
| Type     | type       | text                                                   | Raw MIME            |
| Size     | size       | `formatBytes(value)`                                   | Use shared util     |
| Preview  | (computed) | See "Preview render" below                             | width 100px         |
| Uploaded | createTime | `formatDateTime(value)`                                |                     |
| Actions  | (computed) | Copy URL / Download / Delete                           | width 220px         |

### Preview render

```tsx
{
  title: t('infraFile.table.preview'),
  key: 'preview',
  width: 100,
  render: (_, record) => {
    if (record.type.startsWith(PREVIEWABLE_IMAGE_PREFIX)) {
      return (
        <Image
          src={record.url}
          width={64}
          height={64}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback={DEFAULT_IMAGE_FALLBACK} // optional small data URI placeholder
        />
      )
    }
    if (record.type === PREVIEWABLE_PDF_TYPE) {
      return (
        <a href={record.url} target="_blank" rel="noreferrer">
          {t('infraFile.actions.preview')}
        </a>
      )
    }
    return <Typography.Text type="secondary">—</Typography.Text>
  },
}
```

### Row actions

```
Copy URL | Download | Delete
```

- **Copy URL**: call `copyToClipboard(record.url)` → on success `message.success(t('infraFile.messages.copySuccess'))`, on failure `message.error(...)`.
- **Download**: anchor element `<a href={record.url} target="_blank" download>{name}</a>` styled as link button. BE serves file with `Content-Disposition: attachment` cho non-image types (per `FileController.writeContent`), so direct anchor works.
- **Delete**: standard confirm + mutation.

All gated qua `HasPermission`. Copy URL chỉ cần `query` permission. Download không gate (URL public per BE design). Delete gates `delete`.

### Header bar

- "Upload" button (gated `create`) — opens upload modal
- "Bulk Delete" button — disabled khi `selectedRowKeys.length === 0`, gated `delete`
- Refresh + Search toggle (parity file-config)

### Row selection

Standard checkbox column (no row pre-disable needed — files don't have master concept).

---

## 9. Upload modal (`file-upload-modal.tsx`)

```tsx
interface FileUploadModalProps {
  open: boolean
  onClose: () => void
}
```

### Behavior

- antd `<Modal>` với `<Upload.Dragger multiple customRequest={...} fileList={fileList}>`
- Manage `fileList` state — antd `UploadFile[]`
- `customRequest` callback per file:
  - Set status `uploading`
  - Call `fileApi.upload(file, undefined, onProgress)` với `onProgress` updating fileList entry's `.percent`
  - On success: status `done`, store returned URL
  - On error: status `error`
- Modal footer:
  - Cancel button (closes modal — confirms if any uploads in progress)
  - "Done" button (closes + refetch list query)
- After last file finishes (all `status === 'done' || 'error'`), automatically invalidate query

### customRequest implementation

```tsx
const customRequest: UploadProps['customRequest'] = async ({
  file,
  onProgress,
  onSuccess,
  onError,
}) => {
  try {
    const url = await fileApi.upload(file as File, undefined, (e: ProgressEvent) => {
      if (e.total) {
        onProgress?.({ percent: (e.loaded / e.total) * 100 })
      }
    })
    onSuccess?.(url)
  } catch (err) {
    onError?.(err as Error)
  }
}
```

### Close handling

```tsx
const handleClose = () => {
  const inProgress = fileList.some(f => f.status === 'uploading')
  if (!inProgress) {
    setFileList([]) // reset for next open
    void queryClient.invalidateQueries({ queryKey: fileQueryKey })
    onClose()
    return
  }
  // Confirm cancel (similar pattern to file-config discard confirm — Rule of Two satisfied)
  appModal.confirm({
    title: t('infraFile.upload.cancelInProgress'),
    okText: t('infraFile.upload.cancelConfirm'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    onOk: () => {
      setFileList([])
      void queryClient.invalidateQueries({ queryKey: fileQueryKey })
      onClose()
    },
  })
}
```

### Modal config

- `width={640}`
- `mask={{ closable: false }}` (parity convention)
- `destroyOnHidden` is fine but **fileList state is lost** between opens — actually we want this; user re-opens to do fresh batch
- Footer custom: cancel + "Done" buttons

---

## 10. TD-FE-6 — file-config domain validation

Edit `src/features/infra/file-config/components/file-config-form-modal.tsx`:

### Change 1: DB branch

```tsx
if (storage === FILE_STORAGE.DB) {
  return (
    <Form.Item
      name={['config', 'domain']}
      label={t('infraFileConfig.form.domain')}
      tooltip={t('infraFileConfig.form.domainHelp')}
      rules={[
        { required: true, message: t('infraFileConfig.validation.domainRequired') },
        { type: 'url', message: t('infraFileConfig.validation.domainInvalidUrl') },
      ]}
    >
      <Input placeholder="https://example.com" />
    </Form.Item>
  )
}
```

### Change 2: LOCAL branch — same treatment for domain

```tsx
<Form.Item
  name={['config', 'domain']}
  label={t('infraFileConfig.form.domain')}
  tooltip={t('infraFileConfig.form.domainHelp')}
  rules={[
    { required: true, message: t('infraFileConfig.validation.domainRequired') },
    { type: 'url', message: t('infraFileConfig.validation.domainInvalidUrl') },
  ]}
>
  <Input placeholder="https://example.com" />
</Form.Item>
```

### Change 3: S3 branch domain — optional but if filled, validate URL format

```tsx
<Form.Item
  name={['config', 'domain']}
  label={t('infraFileConfig.form.domain')}
  rules={[{ type: 'url', message: t('infraFileConfig.validation.domainInvalidUrl') }]}
>
  <Input placeholder="https://example.com" />
</Form.Item>
```

S3 not required because BE auto-derives from `endpoint + bucket` khi empty.

### i18n additions (file-config namespace)

EN:

```json
"validation": {
  ...existing...,
  "domainRequired": "Domain is required to generate download URLs",
  "domainInvalidUrl": "Must be a valid URL starting with http:// or https://"
},
"form": {
  ...existing...,
  "domainHelp": "Public URL where this storage is accessible (e.g. your Soar backend host). Required so download links work."
}
```

VI:

```json
"validation": {
  ...existing...,
  "domainRequired": "Domain bắt buộc để tạo URL tải xuống",
  "domainInvalidUrl": "Phải là URL hợp lệ bắt đầu bằng http:// hoặc https://"
},
"form": {
  ...existing...,
  "domainHelp": "URL công khai để truy cập storage này (vd. host backend Soar). Bắt buộc để link tải hoạt động."
}
```

---

## 11. i18n — `infra-file.json` (FULL VI translations — agent copy verbatim)

### EN (`en/infra-file.json`)

```json
{
  "infraFile": {
    "title": "File Management",
    "search": {
      "name": "File Name",
      "type": "File Type",
      "createTime": "Upload Range"
    },
    "table": {
      "id": "ID",
      "name": "File Name",
      "url": "URL",
      "type": "Type",
      "size": "Size",
      "preview": "Preview",
      "createTime": "Uploaded At",
      "actions": "Actions"
    },
    "actions": {
      "upload": "Upload",
      "delete": "Delete",
      "deleteSelected": "Delete {{count}} selected",
      "copyUrl": "Copy URL",
      "preview": "Preview",
      "download": "Download"
    },
    "confirm": {
      "deleteOne": "Delete file \"{{name}}\"?",
      "deleteMany": "Delete {{count}} files?"
    },
    "messages": {
      "deleteSuccess": "File deleted",
      "deleteBulkSuccess": "{{count}} files deleted",
      "uploadSuccess": "Upload succeeded",
      "uploadFailed": "Upload failed",
      "copySuccess": "URL copied to clipboard",
      "copyFailed": "Failed to copy URL"
    },
    "upload": {
      "title": "Upload Files",
      "draggerText": "Click or drag files to this area to upload",
      "draggerHint": "Multiple files supported. Files use the master storage config.",
      "done": "Done",
      "cancelInProgress": "Cancel upload in progress?",
      "cancelConfirm": "Cancel uploads"
    }
  }
}
```

### VI (`vi/infra-file.json`) — REAL Vietnamese translations

```json
{
  "infraFile": {
    "title": "Quản lý File",
    "search": {
      "name": "Tên File",
      "type": "Loại File",
      "createTime": "Khoảng thời gian tải lên"
    },
    "table": {
      "id": "ID",
      "name": "Tên File",
      "url": "URL",
      "type": "Loại",
      "size": "Kích thước",
      "preview": "Xem trước",
      "createTime": "Tải lên lúc",
      "actions": "Thao tác"
    },
    "actions": {
      "upload": "Tải lên",
      "delete": "Xóa",
      "deleteSelected": "Xóa {{count}} mục đã chọn",
      "copyUrl": "Sao chép URL",
      "preview": "Xem trước",
      "download": "Tải xuống"
    },
    "confirm": {
      "deleteOne": "Xóa file \"{{name}}\"?",
      "deleteMany": "Xóa {{count}} file?"
    },
    "messages": {
      "deleteSuccess": "Đã xóa file",
      "deleteBulkSuccess": "Đã xóa {{count}} file",
      "uploadSuccess": "Tải lên thành công",
      "uploadFailed": "Tải lên thất bại",
      "copySuccess": "Đã sao chép URL",
      "copyFailed": "Sao chép thất bại"
    },
    "upload": {
      "title": "Tải lên file",
      "draggerText": "Nhấp hoặc kéo file vào khu vực này để tải lên",
      "draggerHint": "Hỗ trợ nhiều file. File sẽ sử dụng cấu hình storage chính.",
      "done": "Xong",
      "cancelInProgress": "Hủy tải lên đang chạy?",
      "cancelConfirm": "Hủy tải lên"
    }
  }
}
```

> ⚠️ **CRITICAL FOR AGENT**: Copy the VI block above **verbatim** vào `src/shared/i18n/locales/vi/infra-file.json`. KHÔNG dùng EN-mirror như block trước. Long flagged this — agent đã ship VI = EN trong file-config block, requiring manual translation pass. Do not repeat.

---

## 12. Smoke checklist

### Visual / nav

- [ ] Login → sidebar "File Management" parent có hai children: "File List" + "File Config"
- [ ] Click "File List" → URL `/?tab=infra-file`, list page renders
- [ ] Search name (partial match), type (e.g. "image"), createTime range — all work

### TD-FE-6 verification (BEFORE upload smoke)

- [ ] Navigate to file-config → create new LOCAL config WITHOUT filling domain → submit → validation error blocks
- [ ] Fill domain with `localhost:8080` (no protocol) → validation URL format error
- [ ] Fill domain với `http://localhost:48080` → submit success
- [ ] Edit existing LOCAL config (the seeded master) → form pre-fills + domain shows existing value
- [ ] S3 config: leave domain empty → submit success (S3 auto-derives)

### Upload — single file

- [ ] Click Upload → modal opens
- [ ] Drag-drop image (PNG) → progress shows → success
- [ ] Close modal → list refetches → new row appears
- [ ] Image row preview column shows thumbnail
- [ ] Click thumbnail → antd Image lightbox opens

### Upload — multiple files

- [ ] Open modal → drag 3 files simultaneously (image, PDF, text)
- [ ] All 3 show per-file progress
- [ ] All complete → list reflects all 3 after Done

### Upload — cancel

- [ ] Start upload of large-ish file → click X / Cancel before done
- [ ] Confirm dialog shows → cancel uploads
- [ ] Modal closes + list invalidates

### Row actions

- [ ] Image: thumbnail preview lightbox works
- [ ] PDF: "Preview" link → opens browser PDF viewer in new tab
- [ ] Other (e.g. .txt): preview column shows "—"
- [ ] Copy URL: click → toast "Đã sao chép URL" → paste in another tab works
- [ ] Download: opens file in new tab (image renders inline, others trigger download per BE Content-Disposition)
- [ ] Delete: confirm → success → row gone
- [ ] Bulk delete: select 2+ files → click → confirm → all deleted

### TD-FE-6 production verification

- [ ] Upload via LOCAL master → returned URL is `http://localhost:48080/admin-api/infra/file/{configId}/get/{path}` (NOT `null/...`)
- [ ] Click Download in row → file opens correctly

### Permission gating

- [ ] As user without `create` → Upload button hidden
- [ ] As user without `delete` → Delete + Bulk Delete buttons hidden
- [ ] As user without `query` → page itself unreachable (sidebar permission gate)

### Console / errors

- [ ] No console warnings / errors during all flows
- [ ] No "Cannot find translation key" warnings (VI all keys defined)

---

## 13. Future enhancements (deferred — log here for next-session continuity)

Track these in `TECH_DEBT.md` (or wherever Soar tracks observed-not-yet-codified work):

| ID               | Description                                                                                                                                                                                                                                                                                                                                      | Source             | Priority                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------- |
| **DEFER-FILE-1** | **Mode 2 S3 presigned upload** for large files. Current Mode 1 multipart hits Spring multipart limit (~10MB default). When use case needs >50MB uploads, wire `getFilePresignedUrl` + `createFile` two-step flow. UI: detect file size, switch mode automatically.                                                                               | PREP Q1            | Low — defer until file size complaint |
| **DEFER-FILE-2** | **Pre-flight master config check** before opening upload modal. Currently lets user click Upload, BE returns `FILE_CONFIG_NOT_EXISTS` error if no master configured. If admin UX complaint, add proactive disable + tooltip "Configure storage first" + reuse `fileConfigKey.all` query.                                                         | PREP Q11           | Low                                   |
| **DEFER-FILE-3** | **Single-file mode toggle** if multi-file batch UI gets noisy. Add `?single=1` URL param or app setting that limits dragger to `:limit=1`.                                                                                                                                                                                                       | PREP Q2 alt        | Observe                               |
| **BE-TD-8**      | **LOCAL/DB storage URL fallback** — BE `LocalFileClient`/`DBFileClient` should fall back to request host (parsing `ServerHttpRequest`) when `config.domain` empty, parity with S3 auto-derive. Care `X-Forwarded-Host` cho reverse proxy. Eliminates the footgun behind TD-FE-6 entirely; once shipped, FE can relax domain-required validation. | Smoke session      | Low — FE-TD-6 fix already covers UX   |
| **TD-FE-7**      | **Form modal inner-scroll pattern** (`styles.body.maxHeight + overflowY: auto`) — codified when 2nd modal cần. Currently 1 instance (file-config).                                                                                                                                                                                               | CP2 smoke feedback | Observe                               |
| **TD-FE-8**      | **Tall modal inner-scroll** likely needed cho file-upload-modal too khi nhiều file upload (multi-file list grows). Observe in smoke; if cần, port pattern từ file-config. Could be 2nd instance đẩy TD-FE-7 codify.                                                                                                                              | Anticipated        | Observe in smoke                      |

---

## 14. Checkpoint structure

### Checkpoint 1 — Foundation + list page + clipboard utility

Agent delivers:

- `types.ts`, `constants.ts`, `api/index.ts`, `hooks/index.ts`
- `pages/file-list-page.tsx` (full với preview column, all row actions, header bar)
- `components/file-search-form.tsx`
- `src/pages/infra/file/index.tsx`
- `src/shared/lib/clipboard.ts`
- `infra-file.json` (EN + **VI with real translations from §11**)

Skip in CP1: upload modal (placeholder import + commented hook usage OK).

**Claude reviews**:

- API spec (Mode 1 multipart returns String per BE)
- Hook structure (no upload mutation — direct call from modal)
- Preview column: image branch uses `<Image preview>`, PDF branch link, other "—"
- Copy URL: `copyToClipboard` utility called, success/failure toast both handled
- Download anchor target="\_blank"
- VI translations are actual Vietnamese (not EN-mirror)
- formatBytes reused (no re-implementation)

### Checkpoint 2 — Upload modal + TD-FE-6 fix

Agent delivers:

- `components/file-upload-modal.tsx` (full implementation §9 spec)
- List page Upload button wired → modal trigger + close
- TD-FE-6 edits to file-config-form-modal.tsx + infra-file-config.json (en+vi additions)

**Claude reviews**:

- antd Upload customRequest correctly calls fileApi.upload với onProgress wiring
- Multi-file handling: per-file status tracked, all-done detection works
- Cancel handler confirms khi in-progress
- Query invalidates on modal close (success path)
- TD-FE-6: domain required cho DB + LOCAL (with URL format), optional for S3 (with URL format if filled)
- TD-FE-6 i18n VI: actual Vietnamese
- No regression in file-config CRUD flows

### Smoke (after CP2 ship)

Long runs through §12 checklist.

---

## 15. Definition of Done

- [ ] All new feature files created
- [ ] `copyToClipboard` utility added to `src/shared/lib/clipboard.ts`
- [ ] EN + VI i18n complete; **VI translations real, not EN-mirror**
- [ ] TD-FE-6 applied to file-config modal — domain validation + helper text + VI translations
- [ ] No TS errors, no ESLint warnings
- [ ] All smoke checklist items pass
- [ ] Console clean during all flows
- [ ] §13 Future enhancements logged in `docs/TECH_DEBT.md` (or equivalent)

---

## 16. Open risks

1. **antd Upload customRequest typing**: antd v6 expects `onProgress` signature `(event: { percent: number }) => void`. Our wire passes `(e: ProgressEvent) => ...` from axios. Convert before calling: `onProgress?.({ percent: (e.loaded / e.total) * 100 })`. Mental test: 50%-done event triggers UI bar at 50%.

2. **fileList state stale between opens**: agent should reset fileList state khi modal opens (parity với Form.resetFields pattern). Without reset, second-open shows previous batch.

3. **Empty list when no master config**: list query works (returns empty page). Upload button visible. User clicks Upload → uploads fail với `FILE_CONFIG_NOT_EXISTS`. Smoke item: verify error toast surfaces properly per BE error.

4. **URL copy in non-secure context**: localhost is secure context per browser; dev server fine. If Long deploys to plain HTTP non-localhost in future, fallback execCommand path needs verification. Skip for now — production deploy will be HTTPS.

5. **Large file Mode 1 limit**: Spring default multipart `max-file-size=10MB`, `max-request-size=10MB`. Documented in DEFER-FILE-1. If Long uploads >10MB during smoke → 413 error → known limitation.
