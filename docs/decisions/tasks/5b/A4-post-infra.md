# A4 — Post Infrastructure

> Single block. Last lookup module before A5. Simplest of the series — flat list, no tree, no color mapping.

---

## BE confirmed

- `GET /admin-api/system/post/simple-list` (alias `/list-all-simple`) — exists, any authenticated user
- Returns `CommonResult<PostSimpleRespDTO[]>` where each entry:

```typescript
{
  id: number
  name: string
}
```

Server-side already filters to `status = ENABLE`.

---

## Scope

4 files (1 patch + 3 new):

1. `src/shared/api/lookup/post.ts` — NEW — fetch fn + types
2. `src/shared/hooks/use-post-list.ts` — NEW — hooks + `prefetchPostList()`
3. `src/shared/components/post-select.tsx` — NEW — antd Select wrapper
4. `src/layouts/app-shell.tsx` — PATCH — append `prefetchPostList` to existing effect

---

## 1. `src/shared/api/lookup/post.ts` (new file)

```typescript
import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * BE source: PostController.getSimplePostList — returns ENABLE posts only.
 *
 * Posts are flat (no hierarchy unlike dept) — a job position / role within an
 * organization, e.g. "Engineering Manager", "Senior Developer", "QA Lead".
 * Users can have multiple posts (User.postIds: Set<Long>).
 */

export interface PostSimpleDTO {
  id: number
  name: string
}

const URL = '/admin-api/system/post/simple-list'

export async function fetchPostList(): Promise<PostSimpleDTO[]> {
  const res = await request.get<CommonResult<PostSimpleDTO[]>>(URL)
  return res.data.data
}
```

---

## 2. `src/shared/hooks/use-post-list.ts` (new file)

```typescript
import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { fetchPostList, type PostSimpleDTO } from '@/shared/api/lookup/post'

/**
 * Post lookup hooks. Same eager-prefetch + in-memory-cache strategy as dict (A2) + dept (A3).
 *
 * Simpler than dept — no tree builder, no derived hooks beyond list + name lookup.
 *
 * Yudao reference: post fetched in user form + post admin page. No store; fetched
 * per consumer. Soar's shared TanStack Query cache = single fetch reused everywhere
 * (minor improvement over yudao).
 */

export const POST_QUERY_KEY = ['system', 'post', 'all'] as const

export function prefetchPostList(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: POST_QUERY_KEY,
    queryFn: fetchPostList,
    staleTime: Infinity,
  })
}

function usePostListQuery() {
  return useQuery({
    queryKey: POST_QUERY_KEY,
    queryFn: fetchPostList,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Raw flat list of all enabled posts. */
export function usePostList() {
  const { data, isLoading, isError } = usePostListQuery()
  return { data: data ?? [], isLoading, isError }
}

/**
 * Look up the name for a post id. Returns undefined when loading, when id is
 * null/undefined, or when the id doesn't exist in post data.
 */
export function usePostName(id: number | null | undefined): string | undefined {
  const { data } = usePostList()
  if (id == null) return undefined
  return data.find(p => p.id === id)?.name
}
```

---

## 3. `src/shared/components/post-select.tsx` (new file)

```tsx
import { Select, type SelectProps } from 'antd'
import { usePostList } from '@/shared/hooks/use-post-list'

interface PostSelectProps extends Omit<SelectProps, 'options' | 'loading'> {}

/**
 * antd Select pre-filled with the enabled post list.
 *
 * Default is single-select (matches yudao). Pass `mode="multiple"` for the user
 * form where multi-post assignment is the norm (User.postIds: Set<Long>).
 *
 *   // Single (rare — e.g. "primary post"):
 *   <Form.Item name="primaryPostId" label="Primary Post">
 *     <PostSelect allowClear placeholder="Select post" />
 *   </Form.Item>
 *
 *   // Multi (user form — typical):
 *   <Form.Item name="postIds" label="Posts">
 *     <PostSelect mode="multiple" allowClear placeholder="Assign posts" />
 *   </Form.Item>
 *
 * Sensible defaults applied (overridable):
 *  - `showSearch` enabled
 *  - `optionFilterProp="label"` — typing filters by post name
 *
 * Value type: numeric post id(s) (BE Long → JS number). Single-mode value is `number`,
 * multi-mode value is `number[]`.
 */
export function PostSelect(props: PostSelectProps) {
  const { data, isLoading } = usePostList()
  const options = data.map(item => ({ value: item.id, label: item.name }))
  return (
    <Select showSearch optionFilterProp="label" {...props} options={options} loading={isLoading} />
  )
}
```

> Note: `{...props}` after defaults means caller can override (e.g., `showSearch={false}` for small lists where search is overkill).

---

## 4. `src/layouts/app-shell.tsx` (patch)

Append `prefetchPostList` to the existing prefetch effect.

**Find** (last import added in A3):

```tsx
import { prefetchDeptTree } from '@/shared/hooks/use-dept-tree'
```

**Add next to it**:

```tsx
import { prefetchPostList } from '@/shared/hooks/use-post-list'
```

**Find** (the prefetch effect — after A3):

```tsx
useEffect(() => {
  prefetchDictData(queryClient)
  prefetchDeptTree(queryClient)
}, [queryClient])
```

**Replace with**:

```tsx
useEffect(() => {
  prefetchDictData(queryClient)
  prefetchDeptTree(queryClient)
  prefetchPostList(queryClient)
}, [queryClient])
```

---

## Notes on subtle points

### Why no `usePostTree` or hierarchy helpers

Posts are conceptually flat in yudao's data model. If "post categories" or "post hierarchy" emerges as a need later, generalize via `buildTreeFromFlat` (already in `shared/lib/tree.ts` from A3) without rewriting the hook.

### Why `optionFilterProp="label"` default

antd Select's default `optionFilterProp` is `'value'` — same problem as TreeSelect from A3. Typing "1" would filter for posts with `value=1`, useless. Setting `'label'` makes search-by-name work out of the box.

### Multi-mode value type

antd `<Select mode="multiple">` returns `value: number[]`. Forms binding to `postIds: Set<Long>` work as-is — JSON serializes the array, Spring Jackson deserializes to `Set<Long>`. Validated end-to-end via yudao's identical pattern.

### Post admin CRUD will invalidate

Same pattern as dict + dept:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { POST_QUERY_KEY } from '@/shared/hooks/use-post-list'

const qc = useQueryClient()
qc.invalidateQueries({ queryKey: POST_QUERY_KEY })
```

---

## Smoke test

Inline in welcome screen.

```tsx
import { PostSelect } from '@/shared/components/post-select'
import { usePostList, usePostName } from '@/shared/hooks/use-post-list'

function PostSmoke() {
  const { data, isLoading } = usePostList()
  const firstName = usePostName(data[0]?.id ?? null)
  return (
    <div style={{ padding: 24 }}>
      <p>
        Loading: {String(isLoading)}, Count: {data.length}, First: {firstName ?? '-'}
      </p>
      <p>PostSelect single:</p>
      <PostSelect allowClear placeholder="Pick one" style={{ width: 280 }} />
      <p>PostSelect multiple:</p>
      <PostSelect mode="multiple" allowClear placeholder="Pick many" style={{ width: 280 }} />
    </div>
  )
}
// then <PostSmoke /> in the welcome JSX
```

| #    | Step                                      | Expected                                                                                               |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A4-1 | Login. DevTools Network. AppShell mounts. | 3 calls fire from prefetch effect: `/dict-data/simple-list`, `/dept/simple-list`, `/post/simple-list`. |
| A4-2 | Navigate to welcome with test block.      | Both selects populated. Loading=false.                                                                 |
| A4-3 | Type in single-select dropdown.           | Filtering by name works.                                                                               |
| A4-4 | Pick item in multi-select.                | Tag appears. Pick another. Multiple tags. Deselect by clicking tag X. onChange fires with `number[]`.  |
| A4-5 | F5.                                       | Fresh fetch on AppShell remount.                                                                       |
| A4-6 | Switch tabs and back.                     | Zero extra calls.                                                                                      |

After verifying, remove test block.

---

## Apply checklist

- [ ] Create `src/shared/api/lookup/post.ts`.
- [ ] Create `src/shared/hooks/use-post-list.ts`.
- [ ] Create `src/shared/components/post-select.tsx`.
- [ ] Patch `src/layouts/app-shell.tsx` — add import + append to effect.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm lint` passes.
- [ ] Inject test block → smoke A4-1..A4-6 → revert.

---

## Tracker updates (for A4)

Add to `TECH_DEBT.md`: **none**.

A4 pattern fully mirrors A2 + A3. Any debt it would open (sessionStorage, i18n labels) is already covered by existing items:

- sessionStorage persistence → `A2-TD1` (already covers dict + dept + post)
- BE label EN-only → covered by `#14` (broad scope: menu + dict + post + dept labels)

Move from Open to Resolved: **none**.

Update stats snapshot:

```
- 5B/A4 (post): 0 open
- Total open: 23 (unchanged)
- Total resolved: 10 (unchanged)
```

---

**End A4. Awaiting confirmation. Next: A5 — table state (`useTableState` + `usePagedQuery`).**
