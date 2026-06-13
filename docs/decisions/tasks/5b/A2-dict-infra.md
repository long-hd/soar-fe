# A2 — Dict Infrastructure (v2 — eager prefetch)

> Revised per Long's vote change: Q A2.1 → A (eager prefetch).
>
> Single block. Builds dict fetch + cache + `<DictSelect>` + `<DictTag>` for reuse across all CRUD pages.

---

## Change log from v1

- Switched from lazy (first-use trigger) to **eager prefetch at AppShell mount**. Matches yudao timing (post-auth, before any feature page renders).
- Added 1 file touch: **`src/layouts/app-shell.tsx`** patched to call prefetch.
- Added helper export `prefetchDictData(queryClient)`.
- Tech debt A2-TD1 narrowed: Soar now matches yudao on prefetch timing; remaining gap is **sessionStorage persistence** (yudao has it, Soar in-memory only).

---

## BE confirmed

- `GET /admin-api/system/dict-data/simple-list` (alias `/list-all-simple`) — exists, any authenticated user
- Returns `CommonResult<DictDataSimpleRespDTO[]>` where each entry:

```typescript
{
  dictType: string  // e.g. "common_status", "user_sex"
  value: string     // e.g. "0", "1"  ← always string in BE response
  label: string
  colorType?: string  // Element Plus: "default" | "primary" | "success" | "info" | "warning" | "danger"
  cssClass?: string   // unused at this layer for now
}
```

Server-side already filters to `status = ENABLE`.

---

## Scope

5 files (1 patch + 4 new):

1. `src/shared/api/lookup/dict.ts` — NEW — fetch fn + types
2. `src/shared/hooks/use-dict-data.ts` — NEW — TanStack hooks + `prefetchDictData()`
3. `src/shared/components/dict-select.tsx` — NEW — antd Select wrapper
4. `src/shared/components/dict-tag.tsx` — NEW — antd Tag wrapper
5. `src/layouts/app-shell.tsx` — PATCH — call `prefetchDictData` on mount

Folders `src/shared/hooks/` and `src/shared/components/` are new.

---

## 1. `src/shared/api/lookup/dict.ts` (new file)

```typescript
import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * Lookup-style reference data. Cross-cutting (used by every CRUD page),
 * therefore lives in `shared/api/lookup/` rather than a per-feature module.
 *
 * BE source: DictDataController.getSimpleDictDataList (returns ENABLE items only).
 *
 * Note on `value` typing: BE returns `value` as String regardless of the semantic
 * type. Forms that bind to numeric fields (e.g., status: 0|1) work because antd
 * Select and JSON serialization preserve the string through to the request body;
 * Spring's Jackson coerces back to Integer on the BE side. If strict typing
 * becomes a requirement, normalize at the form's `normalize` prop or at the
 * mutation boundary.
 */

export interface DictDataSimpleDTO {
  dictType: string
  value: string
  label: string
  colorType?: string
  cssClass?: string
}

const URL = '/admin-api/system/dict-data/simple-list'

export async function fetchDictDataList(): Promise<DictDataSimpleDTO[]> {
  const res = await request.get<CommonResult<DictDataSimpleDTO[]>>(URL)
  return res.data.data
}
```

---

## 2. `src/shared/hooks/use-dict-data.ts` (new file)

```typescript
import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchDictDataList, type DictDataSimpleDTO } from '@/shared/api/lookup/dict'

/**
 * Dict data lookup hooks.
 *
 * Caching strategy (per Q A2.1 = A — eager prefetch):
 *  - `AppShell` mounts after authentication → calls `prefetchDictData(queryClient)`
 *    once. This fires the BE request in the background, fire-and-forget.
 *  - Subsequent `useDictData` / `useDictDataAll` / `<DictSelect>` / `<DictTag>`
 *    consumers hit the populated cache without triggering new fetches.
 *  - `staleTime: Infinity` + `gcTime: Infinity` → no auto-refetch within the
 *    React app lifetime.
 *  - The dict admin CRUD page (port loop) MUST call
 *      `queryClient.invalidateQueries({ queryKey: DICT_QUERY_KEY })`
 *    after any dict mutation to refresh consumers.
 *
 * Yudao reference: eager prefetch in `permission.ts:beforeEach` (fire-and-forget)
 *   + persisted to sessionStorage via `wsCache`. F5 reads sessionStorage →
 *   zero extra BE call.
 *
 *   Soar matches yudao on prefetch timing but is in-memory only — F5 triggers
 *   1 fresh fetch (during AppShell mount, parallel with other init).
 *   See tech debt A2-TD1 for the path to full parity (sessionStorage persister).
 */

export const DICT_QUERY_KEY = ['system', 'dict', 'all'] as const

/**
 * Trigger dict data prefetch. Idempotent — TanStack Query dedupes if the
 * key is already in-flight or cached. Safe to call from multiple places.
 *
 * Called by AppShell on mount (after auth). Fire-and-forget — caller should
 * not await; UI components handle the brief loading state gracefully.
 */
export function prefetchDictData(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: DICT_QUERY_KEY,
    queryFn: fetchDictDataList,
    staleTime: Infinity,
  })
}

function useDictListQuery() {
  return useQuery({
    queryKey: DICT_QUERY_KEY,
    queryFn: fetchDictDataList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** All dict entries grouped by `dictType`. Empty map while loading. */
export function useDictDataAll() {
  const { data, isLoading, isError } = useDictListQuery()

  const map = useMemo(() => {
    const out = new Map<string, DictDataSimpleDTO[]>()
    if (!data) return out
    for (const item of data) {
      const existing = out.get(item.dictType)
      if (existing) existing.push(item)
      else out.set(item.dictType, [item])
    }
    return out
  }, [data])

  return { data: map, isLoading, isError }
}

/** Items for a single dict type. Empty array if loading or type doesn't exist. */
export function useDictData(dictType: string) {
  const { data, isLoading, isError } = useDictDataAll()
  const items = useMemo(() => data.get(dictType) ?? [], [data, dictType])
  return { data: items, isLoading, isError }
}

/**
 * Look up the full entry for a (type, value) pair.
 * Returns undefined when loading, when value is null/undefined, or when the
 * (type, value) combination doesn't exist in dict data.
 */
export function useDictEntry(
  dictType: string,
  value: string | number | null | undefined,
): DictDataSimpleDTO | undefined {
  const { data } = useDictData(dictType)
  if (value == null) return undefined
  const target = String(value)
  return data.find(d => d.value === target)
}

/** Shortcut for label-only lookup. */
export function useDictLabel(
  dictType: string,
  value: string | number | null | undefined,
): string | undefined {
  return useDictEntry(dictType, value)?.label
}
```

---

## 3. `src/shared/components/dict-select.tsx` (new file)

```tsx
import { Select, type SelectProps } from 'antd'
import { useDictData } from '@/shared/hooks/use-dict-data'

interface DictSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  /** Dict type from BE seed, e.g. "common_status", "user_sex". */
  dictType: string
}

/**
 * antd Select pre-filled with dict items for the given `dictType`.
 *
 * Forwards all standard Select props (value, onChange, allowClear, placeholder,
 * mode="multiple", etc.). Works inside antd Form.Item without extra wiring:
 *
 *   <Form.Item name="status" label="Status">
 *     <DictSelect dictType="common_status" allowClear />
 *   </Form.Item>
 *
 * Note on value type: BE returns `value` as a string. The Select's controlled
 * value will therefore be a string ("0", "1", etc.). When binding to numeric
 * BE fields (e.g., `status: Integer`), JSON request bodies still serialize as
 * strings — Spring Jackson coerces these back to integers on the BE.
 *
 * If a form needs strict numeric typing on the client side, use Form.Item's
 * `normalize`:  normalize: v => v == null ? v : Number(v)
 */
export function DictSelect({ dictType, ...rest }: DictSelectProps) {
  const { data, isLoading } = useDictData(dictType)
  const options = data.map(item => ({ value: item.value, label: item.label }))
  return <Select {...rest} options={options} loading={isLoading} />
}
```

---

## 4. `src/shared/components/dict-tag.tsx` (new file)

```tsx
import { Tag } from 'antd'
import type { ReactNode } from 'react'
import { useDictEntry } from '@/shared/hooks/use-dict-data'

/**
 * Element Plus color name → antd Tag preset color name.
 *
 * BE seeds dict items with `colorType` from element-plus palette
 * ("default" | "primary" | "success" | "info" | "warning" | "danger").
 * We map at render time to keep BE seeds yudao-compatible while rendering
 * via antd Tag.
 *
 * Unknown `colorType` values fall back to the default (gray) Tag.
 */
const COLOR_MAP: Record<string, string> = {
  default: 'default',
  primary: 'blue',
  success: 'green',
  info: 'cyan',
  warning: 'orange',
  danger: 'red',
}

interface DictTagProps {
  /** Dict type from BE seed, e.g. "common_status", "user_sex". */
  dictType: string
  /** The raw value to look up. Compared against entry.value as a string. */
  value: string | number | null | undefined
  /**
   * Fallback when the (type, value) lookup misses (loading, unknown value,
   * or null value). Default: render the raw `value` as plain text, or empty
   * string when value is null/undefined.
   */
  fallback?: ReactNode
}

/**
 * Read-only display of a dict value as an antd Tag colored per the BE
 * `colorType` seed.
 *
 *   <DictTag dictType="common_status" value={record.status} />
 *   <DictTag dictType="user_sex" value={record.sex} fallback="—" />
 *
 * Use inside Table columns:
 *   {
 *     title: 'Status',
 *     dataIndex: 'status',
 *     render: (v) => <DictTag dictType="common_status" value={v} />,
 *   }
 */
export function DictTag({ dictType, value, fallback }: DictTagProps) {
  const entry = useDictEntry(dictType, value)

  if (!entry) {
    if (fallback !== undefined) return <>{fallback}</>
    return <>{value == null ? '' : String(value)}</>
  }

  const color = entry.colorType ? (COLOR_MAP[entry.colorType] ?? 'default') : 'default'
  return <Tag color={color}>{entry.label}</Tag>
}
```

---

## 5. `src/layouts/app-shell.tsx` (patch)

Add 3 things: 2 imports + 1 effect. No JSX changes.

**Add** these imports next to the existing import block at the top:

```tsx
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchDictData } from '@/shared/hooks/use-dict-data'
```

> If `useEffect` is already imported (e.g., already used elsewhere in AppShell), merge into the existing react import — don't duplicate.

**Insert** in the component body, right after the existing hooks and before `return`:

```tsx
const queryClient = useQueryClient()

// Eager prefetch of cross-cutting lookup data.
// Fire-and-forget — components handle loading state gracefully.
// Runs once per AppShell mount (i.e., once per browser-tab session per logged-in user).
useEffect(() => {
  prefetchDictData(queryClient)
}, [queryClient])
```

A3 + A4 will append their own `prefetchDept` / `prefetchPost` calls inside this same effect block (or in sibling effects) following the same pattern.

---

## Notes on subtle points

### Why prefetch in `useEffect` and not at module init

Module-init prefetch fires before QueryClient is constructed and before auth completes. `useEffect` in AppShell guarantees:

- Auth completed (AppShell only mounts after AuthGuard passes)
- QueryClient ready (provided above AppShell in the tree)
- Runs once on mount, doesn't re-fire on re-renders (`queryClient` ref stable)

### Race condition: prefetch in-flight when a consumer mounts

TanStack Query handles this. A `useQuery` with the same key joins the in-flight request — single network call, all subscribers update when the response lands. No double-fetch.

### Why `prefetchQuery` and not `useQuery` in AppShell

`useQuery` would make AppShell a subscriber to dict data — re-rendering every time dict data changes (e.g., after invalidation). AppShell doesn't render anything based on the data; `prefetchQuery` warms the cache without subscribing.

### What if BE is down at AppShell mount

`prefetchQuery` returns a Promise we don't await. Failure → TanStack records error in cache. When a consumer mounts later, `useQuery` re-tries on next mount or shows error state. `<DictSelect>` displays empty options; `<DictTag>` falls back to raw value. Graceful degradation.

For Phase 5C polish: add `retry: 3` to prefetch query options + a manual "Refresh dictionary" button for ops.

### Dict admin CRUD will invalidate

When the dict admin page (port loop) creates/updates/deletes dict items:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { DICT_QUERY_KEY } from '@/shared/hooks/use-dict-data'

const qc = useQueryClient()
// after successful mutation:
qc.invalidateQueries({ queryKey: DICT_QUERY_KEY })
```

This refetches dict data and re-renders all `<DictSelect>` / `<DictTag>` mounted anywhere.

---

## Smoke test

Phase 5B doesn't have a CRUD page yet → test inline in welcome screen of `tab-renderer.tsx`. Add test block, then revert.

```tsx
import { DictSelect } from '@/shared/components/dict-select'
import { DictTag } from '@/shared/components/dict-tag'

// Inside the welcome render:
;<div style={{ padding: 24 }}>
  <p>DictTag examples:</p>
  <DictTag dictType="common_status" value={0} /> {/* "Enabled" green */}
  <DictTag dictType="common_status" value={1} /> {/* "Disabled" red */}
  <DictTag dictType="user_sex" value={1} /> {/* "Male" */}
  <DictTag dictType="nonexistent" value={0} fallback="—" />
  <p>DictSelect example:</p>
  <DictSelect
    dictType="common_status"
    allowClear
    placeholder="Pick status"
    style={{ width: 200 }}
  />
</div>
```

| #    | Step                                                           | Expected                                                                                                                                             |
| ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2-1 | Login. Open DevTools Network tab. Wait for AppShell to render. | 1 call to `/admin-api/system/dict-data/simple-list` fires almost immediately (from AppShell mount effect). No `?tab=` needed — fires on shell mount. |
| A2-2 | Inject test block above; navigate to welcome.                  | Tags + Select render immediately if A2-1 completed first. Otherwise brief loading state, then renders.                                               |
| A2-3 | Switch to another tab and back to welcome.                     | Zero extra calls. Cache hit.                                                                                                                         |
| A2-4 | F5 reload.                                                     | 1 fresh call to `/dict-data/simple-list` fires on AppShell remount (in-memory cache lost).                                                           |
| A2-5 | Logout + log back in.                                          | 1 call after new AppShell mount post-login. (Logout unmounts AppShell + clears QueryClient cache.)                                                   |
| A2-6 | Type into `<DictSelect>` dropdown.                             | Options appear from dict. onChange fires with string value ("0", "1").                                                                               |

After verifying, **remove the test block**. Hooks + components + AppShell patch stay.

---

## Apply checklist

- [ ] Create `src/shared/api/lookup/dict.ts`.
- [ ] Create `src/shared/hooks/use-dict-data.ts`.
- [ ] Create `src/shared/components/dict-select.tsx`.
- [ ] Create `src/shared/components/dict-tag.tsx`.
- [ ] Patch `src/layouts/app-shell.tsx` — add 2-3 imports + 1 effect.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm lint` passes.
- [ ] Inject test block in welcome screen → smoke A2-1..A2-6 → revert.

---

## Tech debt opened by A2

| #      | Item                                                                                                                                                                                                                                                                             | Defer until                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A2-TD1 | No sessionStorage persistence. F5 = 1 extra fetch (during AppShell mount, parallel with other init — barely noticeable). Yudao has `wsCache` sessionStorage persistence → 0 calls after F5. Path to parity: add `@tanstack/query-sync-storage-persister` + `persistQueryClient`. | Only if F5 latency observed as problem.                                      |
| A2-TD2 | Dict values are stringly typed (e.g., `"0"` not `0`). Forms binding to numeric BE fields rely on Spring Jackson coercion; client-side numeric ops require explicit `Number()`.                                                                                                   | Address only if a specific form needs numeric value semantics on the client. |
| A2-TD3 | i18n labels — BE seed in English only. Same as tech debt #14 (menu labels) from Phase 5A.                                                                                                                                                                                        | Phase 5C i18n batch.                                                         |
| A2-TD4 | `cssClass` field on dict entries is unused.                                                                                                                                                                                                                                      | Add to DictTag's `className` prop when a styling need surfaces.              |

---

**End A2 v2. Awaiting confirmation before A3 (Dept infra — flat list → client tree build + `<DeptTreeSelect>`).**
