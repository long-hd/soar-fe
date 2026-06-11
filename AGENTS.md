# AGENTS.md — Soar Frontend

> Cross-tool standard. Read by Claude Code, Cursor, Codex, and any AI coding agent.
> Authoritative architecture spec: `soar-be/docs/FE_Admin_Architecture_Plan.md`. Read it first.
> Last reviewed: 2026-06-10 (Phase 5A complete). See `PHASE_5A_SUMMARY.md` for current baseline.

## Project Overview

Soar frontend — React admin platform rebuilt from RuoYi-Vue-Pro / yudao Vue3 frontend.
Paired with `soar-be` (Spring Boot backend). Multi-tenant. Permission-driven UI from BE menu tree.

### Stack

- **React 19.2+** with TypeScript (strict mode, `erasableSyntaxOnly`, `verbatimModuleSyntax`)
- **React Compiler** (via `babel-plugin-react-compiler`) — auto-memoize at build time; do NOT add manual `useMemo`/`useCallback` by default
- **Vite 8** (build tool, Rolldown bundler, native ESM, fast HMR)
- **Ant Design v6** (antd core, no ProComponents)
- **Redux Toolkit** + **redux-persist** (client state)
- **TanStack Query v5** (server state, cache, dedupe)
- **react-router-dom v7** (thin role: login vs main shell only)
- **axios** (HTTP, single-flight refresh token)
- **i18next** + **react-i18next** (key-driven from day 1)
- **dayjs** (date/time, antd v6 default)
- **@iconify/react** (icons; matches yudao seed strings; offline bundle)
- **Tailwind CSS v4** (utility classes for layout primitives ONLY — no theme-aware colors)

### NOT in the stack (deliberately)

- **shadcn/ui**: rejected as component library — antd is the UI library. Tailwind v4 IS used, but only for layout primitives (see CONVENTIONS §Styling).
- **ProComponents (antd Pro)**: rejected — config-driven, inflexible.
- **react-hook-form + zod**: NOT installed by default. antd Form is the form solution. Add zod + RHF per-feature only if a specific complex form justifies it.
- **TanStack Router**: rejected — react-router-dom is enough for the thin role we give the router.
- **Lucide / Heroicons / antd Icons**: rejected as primary — Iconify matches yudao seed strings.
- **web-storage-cache (yudao `wsCache`)**: rejected — unmaintained. Use `localStorage` thuần. Token expiry handled by 401 → refresh interceptor flow, no client-side TTL needed.

## Build & Run

```bash
pnpm install
pnpm dev           # Dev server (BE handles CORS via allow-origin-pattern *; no Vite proxy)
pnpm build
pnpm type-check
pnpm test          # Vitest unit + integration
```

## Directory Structure

```
src/
├── app/                        # App infrastructure
│   ├── store.ts                # Redux store + persist config
│   ├── query-client.ts         # TanStack Query client
│   ├── providers.tsx           # Composed providers
│   └── slices/
│       ├── auth-slice.ts       # user, tokens, permissions, menus (persisted to localStorage)
│       ├── tags-view-slice.ts  # openTabs + activeTabId (persisted to sessionStorage, per-browser-tab)
│       └── theme-slice.ts      # 'light' | 'dark'
│
├── shared/                     # Cross-cutting, reusable
│   ├── api/
│   │   ├── http-client.ts      # axios instance named `request`
│   │   ├── types.ts            # CommonResult<T>, PageResult<T>, PageParam, AuthTokensDTO
│   │   └── interceptors/
│   │       ├── auth-interceptor.ts   # 401 → single-flight refresh + replay queue
│   │       └── error-interceptor.ts  # CommonResult code validation, non-zero toast (NO unwrap)
│   ├── components/
│   │   ├── has-permission.tsx
│   │   ├── dict-tag.tsx
│   │   ├── dict-select.tsx
│   │   └── tree-select.tsx
│   ├── hooks/
│   │   ├── use-dict.ts
│   │   ├── use-paged-query.ts
│   │   └── use-permission.ts
│   ├── lib/
│   │   ├── env.ts
│   │   ├── tenant.ts           # localStorage I/O for tenantId — NO env var fallback
│   │   ├── token.ts            # localStorage I/O for access + refresh tokens
│   │   ├── format.ts           # formatDate, formatDateTime
│   │   └── permission-matcher.ts
│   └── i18n/
│       ├── index.ts
│       └── locales/{en,vi,zh-CN}.json
│
├── features/                   # Business code by domain
│   ├── auth/
│   │   ├── api/
│   │   │   └── auth-api.ts     # login, logout, refresh, getPermissionInfo, getTenantByWebsite
│   │   ├── components/
│   │   │   └── tenant-boot-gate.tsx
│   │   └── types.ts            # AuthLoginReqDTO, AuthLoginRespDTO, AuthPermissionInfoRespDTO, ...
│   ├── permission/
│   │   └── hooks/
│   │       └── use-permission.ts   # Phase 5B
│   ├── system/
│   │   ├── user/
│   │   │   ├── api/
│   │   │   │   └── user-api.ts        # userApi.page/get/create/update/delete
│   │   │   ├── components/
│   │   │   │   ├── user-list-page.tsx
│   │   │   │   ├── user-detail-page.tsx
│   │   │   │   ├── user-form-modal.tsx
│   │   │   │   └── user-search-form.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts               # UserListItemDTO, UserCreateReqDTO, ...
│   │   ├── role/
│   │   ├── dept/
│   │   ├── menu/
│   │   ├── dict/
│   │   └── tenant/
│   └── infra/
│
├── pages/                      # Thin wrappers (~10 lines each) — dispatcher targets for import.meta.glob
│   ├── system/
│   │   ├── user/
│   │   │   ├── index.tsx       # → <UserListPage />
│   │   │   └── detail.tsx      # → <UserDetailPage />
│   │   ├── role/
│   │   │   └── index.tsx
│   │   └── ...
│   ├── infra/
│   ├── login/
│   │   └── login-page.tsx
│   └── error/
│       ├── not-found.tsx
│       ├── forbidden.tsx
│       └── tenant-error.tsx
│
├── layouts/
│   ├── app-shell.tsx           # main shell (header + sider + content). NO <Outlet> for menu content.
│   ├── blank-layout.tsx        # for login/forbidden/tenant-error
│   └── components/
│       ├── sider-menu.tsx
│       ├── tab-bar.tsx         # Phase 5B
│       ├── header-bar.tsx
│       └── tab-renderer.tsx    # import.meta.glob loader + Suspense (Activity retrofit Phase 5C)
│
└── routes/
    ├── router.tsx              # top-level createBrowserRouter — 4 routes
    └── guards/
        └── auth-guard.tsx
```

**Feature folder rules**:

- `api/<entity>-api.ts` (named file), NOT `api/index.ts`.
- `types.ts` flat by default. Use `types/<entity>-types.ts` subfolder only when feature has >1 entity OR types file >200 lines.
- No `index.ts` barrel at feature root — pages import explicit paths.

## Architecture Rules

### Import Direction

- `features/` → `shared/` ✅
- `pages/` → `features/` ✅ (pages are thin wrappers)
- `layouts/` → `features/` → `shared/` ✅
- `shared/` → `features/` ❌
- `features/A` → `features/B` ❌ (move to `shared/` if cross-feature)

### State Management Split

- **Redux Toolkit**: auth, permissions, menu tree, open tabs, theme
- **TanStack Query**: all server data (lists, details, mutations)
- **antd Form**: form state (local to each form)
- **`useState` in component**: table state (pageNo, pageSize, filters, sort) — **NOT URL-synced** (see decision §11.7 in Plan)

### Persistence Split

- **localStorage** (cross-tab session): `auth-slice` (tokens, permissions, menus), `tenantId`, `theme-slice`.
- **sessionStorage** (per-browser-tab): `tags-view-slice` (open tabs + active tab). F5 keeps tabs; new browser-tab starts fresh.
- Both wired via `redux-persist` per-slice transform.

### URL pattern — flat with `?tab=<tab_key>`

This is critical and unusual. Read carefully.

- **All menu-triggered pages live at the single root path `/`**. No `/system/user`, no `/admin/dashboard`.
- URL shape: `/?tab=<tab_key>&<arbitrary params>`
  - `tab` = dispatcher key, matches `system_menu.tab_key`.
  - Other params (id, dictType, ...) flow to the component via context.
- `react-router-dom` is used only for `/login`, `/forbidden`, `/`, `/*`. Four top-level routes total.
- **`<Outlet>` is NOT used inside the main shell** — AppShell renders tabs directly from Redux state using a glob loader.
- Page file lookup: BE menu DTO returns `component` field (e.g., `system/user/index`). `tab-renderer.tsx` runs `import.meta.glob('/src/pages/**/*.tsx')` and resolves the path. Two dispatcher keys: `tab_key` (URL) + `component` (file path).
- See Plan §3 and §6 for the full mechanism and reasoning.

### Tabs view with React 19.2 `<Activity>`

- Each open tab is a record in `tags-view-slice` (Redux), rendered inside `<Activity mode={isActive ? 'visible' : 'hidden'}>` if `menu.keepAlive` is true.
- Tabs persisted to **sessionStorage** (not localStorage) via redux-persist — per-browser-tab isolation.
- F5 keeps tabs. New browser-tab gets a fresh state.
- **Phased rollout**:
  - **Phase 5A**: NO tabs UI. `tab-renderer.tsx` does plain swap on URL change.
  - **Phase 5B**: TabBar UI (open/close/active), still plain swap.
  - **Phase 5C**: `<Activity>` retrofit for keep-alive.
- Do NOT ship `<Activity>` before 5C.

### Permission-Driven UI

- `<HasPermission code="system:user:create">` — renders children only if user has permission.
- `usePermission()` hook — exposes `hasPermission(code)` method. Super admin wildcard `*:*:*` is handled inside (defensive match — BE currently enumerates all codes, but matcher accepts wildcard if BE adds it later).
- Sidebar rendered dynamically from menu tree API (`/get-permission-info`).
- AppShell looks up `menu.tab_key` from menus loaded post-login. URL with unknown `tab_key` → render not-found in content area (do NOT navigate `/forbidden` — that's for missing role, not missing tab).

### API Conventions

- All API calls go through the axios instance `request` from `shared/api/http-client.ts`.
- Interceptors:
  - **Request**: attach `tenant-id` header (`getTenantId()` from `shared/lib/tenant.ts`) + `Authorization: Bearer <access>`. If `tenantId` is null (boot before resolve), do not attach — the only allowed request without `tenant-id` is `/system/tenant/get-by-website` (marked `@TenantIgnore` on BE).
  - **Response — auth-interceptor**: on `CommonResult.code === 401`, run single-flight refresh (port pattern from yudao `service.ts` — module-level `isRefreshing` + `requestQueue`). Replay queued requests with new token.
  - **Response — error-interceptor**: validate `CommonResult.code`. On `code === 0`, pass response through unchanged (do NOT unwrap — callers explicitly `.data.data`). On `code === 401`, delegated to auth-interceptor for single-flight refresh. Other non-zero codes → toast `msg` + reject with `Error(msg)`.
- API functions in `features/{module}/{entity}/api/<entity>-api.ts`. Each method declares its unwrapped return type and performs `res.data.data` as the last expression.
- TanStack Query keys: arrays with feature namespace, e.g., `['user', 'list', params]`, `['user', 'detail', id]`. Do NOT bake URL paths into keys.
- Backend action-path pattern (NOT REST):
  - `GET /admin-api/{module}/{entity}/page?pageNo=1&pageSize=10&...`
  - `GET /admin-api/{module}/{entity}/get?id=`
  - `POST /admin-api/{module}/{entity}/create`
  - `PUT /admin-api/{module}/{entity}/update`
  - `DELETE /admin-api/{module}/{entity}/delete?id=`
- Pagination params: `pageNo` (1-based), `pageSize`. NOT `page`/`size`/`current`.
- File upload: `POST /admin-api/infra/file/upload` (multipart, field `file` + optional `directory`); returns access URL.

### Tenant-id resolution

- Every authenticated request sends `tenant-id` header. Helper: `getTenantId()` reads `localStorage`. **No env var fallback** — if storage is empty, the request should not be sent (boot order must resolve tenant first).
- **App boot flow**: `tenant-boot-gate.tsx` mounts first, calls `GET /admin-api/system/tenant/get-by-website?website=${location.host}`. On success, `setTenantId(res.id)`. On miss (returns null), render `tenant-error.tsx` page.
- The endpoint `/get-by-website` is marked `@PermitAll` + `@TenantIgnore` on BE — it is the only request that runs without a `tenant-id` header.
- Login itself REQUIRES `tenant-id`. BE will reject with 400 if missing.
- For dev: seed `system_tenant.websites` with `localhost:5173`, `localhost:4173`, plus any port used. For prod: append production hostname. Single row with multi-host array is the norm for single-tenant deployments; add rows when expanding to multi-tenant.

### Refresh token — single-flight

Port pattern from yudao `service.ts`. Module-level state `isRefreshing` + `requestQueue`. First 401 triggers refresh; subsequent 401s during refresh are queued and replayed. Refresh request itself uses a bare axios call (no interceptor chain) to avoid recursion. Soar adds a `_isRetry` flag on the request config to prevent infinite loop if BE keeps returning 401 after refresh — fails fast with `handleAuthorized()` (Modal.confirm + dispatch logout via dynamic import). See Plan §7.1 for full code.

## Component Conventions

### Shared Components (in `shared/components/`)

- `<HasPermission code="..." fallback={...}>` — permission gate
- `<DictTag dictType="..." value={...}>` — colored badge from dict data
- `<DictSelect dictType="...">` — antd Select bound to a dict type
- `<TreeSelect>` — wrapper for dept/menu tree

### Page Structure Pattern

Each CRUD page follows:

```tsx
// File: features/system/user/components/user-list-page.tsx

/** User management list page. */
export default function UserListPage() {
  const params = useContext(TabParamsContext) // params from ?tab=...&...
  const can = usePermission()
  const { t } = useTranslation()

  const [tableState, setTableState] = useState({ pageNo: 1, pageSize: 10 })
  const [filters, setFilters] = useState<UserSearchForm>({})

  const { data, isLoading, tableProps } = usePagedQuery({
    queryKey: ['user', 'list', { ...tableState, ...filters }],
    queryFn: () => userApi.page({ ...tableState, ...filters }),
    state: tableState,
    setState: setTableState,
  })

  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; id?: number }>({
    open: false,
    mode: 'create',
  })

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
      <Table {...tableProps} columns={columns} rowKey="id" />
      <UserFormModal {...modal} onClose={() => setModal(m => ({ ...m, open: false }))} />
    </Card>
  )
}
```

### Thin wrapper in `pages/`

```tsx
// File: src/pages/system/user/index.tsx
import UserListPage from '@/features/system/user/components/user-list-page'
import { useDocumentTitle } from '@/shared/hooks/use-document-title'
import { useTranslation } from 'react-i18next'

export default function Page() {
  const { t } = useTranslation()
  useDocumentTitle(t('system.user.title'))
  return <UserListPage />
}
```

**Pages exist solely to be discoverable by `import.meta.glob('/src/pages/**/\*.tsx')`.** Keep them under 20 lines. All logic lives in `features/`.

## Coding Conventions

See `CONVENTIONS.md` for full details. Highlights:

- File naming: **kebab-case** for ALL files including components (`user-list-page.tsx`, `dict-select.tsx`, `app-shell.tsx`, `auth-guard.tsx`). NO PascalCase file names anywhere.
- Folder naming: **kebab-case**.
- Component export naming: **PascalCase** in code (`UserListPage`, `DictSelect`) — file kebab, export PascalCase.
- Hook file naming: `use-xyz.ts` exports `useXyz`.
- Type suffix: **DTO** (matching BE), e.g., `UserListItemDTO`, `UserCreateReqDTO`.
- Comments: **English only**. No Chinese comments anywhere. JSDoc on exported components, hooks, and non-trivial functions.
- No hardcoded colors. Use `theme.useToken()` from antd or `style={{ color: token.colorX }}`. **Never** use Tailwind color classes (`bg-white`, `text-gray-900`, `bg-blue-500`) on theme-sensitive elements.
- Tailwind v4 is used for layout primitives only: spacing (`p-4`, `gap-2`), sizing (`w-full`), flex/grid (`flex items-center`), positioning. NOT for colors. See CONVENTIONS §Styling.
- No hardcoded text strings in JSX. Use `t('key.path')` from i18next.

## Don't

- ❌ Don't use Vite `server.proxy` or any dev-only workaround that masks BE configuration gaps. If BE has CORS issues, fix BE CORS config. Dev environment behavior MUST match production.
- ❌ Don't fall back to env vars (e.g., `VITE_DEFAULT_TENANT_ID`) when a BE endpoint should provide the value. Add the BE endpoint instead.
- ❌ Don't wrap callbacks in `useCallback` or values in `useMemo` by default. React Compiler handles this. Only add manual memoization when profiling shows a measured need.
- ❌ Don't mutate state, props, or destructured values during render — silently disables React Compiler optimization on that component.
- ❌ Don't hardcode role checks (`if user.role === 'ADMIN'`). Use `<HasPermission>`.
- ❌ Don't use `useEffect` for data fetching. Use TanStack Query.
- ❌ Don't put API URLs as strings in components. Centralize in `features/{module}/{entity}/api/`.
- ❌ Don't use `any` type. Define proper interfaces (suffix `DTO` for BE-mirrored types).
- ❌ Don't hardcode colors or text strings.
- ❌ Don't use Tailwind for colors (`bg-blue-500`, `text-gray-900`). Use antd tokens.
- ❌ Don't put `className` on antd components for visual styling. Use antd props (`type`, `danger`, `size`) or theme overrides.
- ❌ Don't use `<Outlet>` inside the main shell for menu content.
- ❌ Don't install `react-hook-form` or `zod` to `package.json` baseline (per-feature add only).
- ❌ Don't create components > 200 lines. Split.
- ❌ Don't import from other feature modules. Move shared code to `shared/`.
- ❌ Don't use `localStorage` for tabs state — use `sessionStorage` (via redux-persist).
- ❌ Don't sync table state to URL by default (acc-fe pattern intentionally not adopted; see Plan §11.7).
- ❌ Don't ship `<Activity>` before Phase 5C.
- ❌ Don't use PascalCase for file or folder names.
- ❌ Don't write Chinese comments. English only, regardless of yudao source.

## Communication & Decisions

When porting from `yudao-ui-admin-vue3` (Vue) to Soar (React) — or adapting any reference codebase (`acc-logistic-rmk-fe`, yudao-cloud, etc.) — agents follow these rules to keep decisions traceable and avoid silent drift.

### Reference-following

- **Default: port 1:1.** Match yudao's pattern unless there is a concrete reason to deviate (Vue→React semantics gap, decision already chosen in `FE_Admin_Architecture_Plan.md`, or maintenance status of a dep).
- **Deviations must be explicit.** When deviating from yudao for any reason, the agent states the source pattern (file path + snippet or summary), the proposed Soar adaptation, and the reason. Inline `// pattern from yudao service.ts:42 — adapted because <reason>` keeps the trace readable in code review.
- **Don't silently substitute libraries.** If yudao uses `web-storage-cache` and the agent proposes `localStorage` thuần, that is a deviation — raise it, don't ship it.

### Asking vs deciding

- **When unsure whether the user wants 1:1 port or adaptation, ASK.** Format: state the yudao pattern, list 2–3 alternatives (port 1:1 / adapt / skip), give a short recommendation with reasoning, and end with a question. Do not pick on the user's behalf.
- **Edge cases that look minor are still questions.** Storage key naming, TTL semantics, error message wording, default sort order — small decisions accumulate. When the user has expressed a preference for matching a reference, default to asking.
- **Don't invent context.** If a fact about the codebase is needed (e.g., "does file X exist", "is this field nullable"), read the source or ask. Do not fabricate from memory.

### Examples vs decisions

- **Mark illustrative examples as `EXAMPLE` or `ILLUSTRATION`** in any document, comment, or chat response that mixes proposed code with format demonstrations. Phrasing like "for instance, the file would look like X" must not be mistaken for a chosen approach.
- **Never use real file paths in EXAMPLE blocks** unless that file path is also the final decision. Use `placeholder-name.ts` or wrap with a comment marking the block as illustrative.

### No workarounds for missing dependencies

- **If BE is missing an API, request it.** Do not work around with a client-side stub, env var default, or hardcoded value that hides the gap. (Specific case: Vite `server.proxy` for BE CORS — already in §Don't.)
- **If a yudao pattern depends on a library Soar doesn't have, request the library decision.** Either add the library (with maintenance check per `soar-be` library rule — verify last release, maintainer activity, framework compatibility) or write an equivalent helper. Do not skip the pattern silently.
- **If a decision is missing from `FE_Admin_Architecture_Plan.md`, ask the user.** Do not infer from yudao behavior alone — yudao has dead code branches (e.g., `*:*:*` wildcard check in `hasPermi.ts` that never triggers with yudao BE) and outdated patterns.

## Verification Checklist

- [ ] `pnpm type-check` passes
- [ ] `pnpm build` succeeds
- [ ] No `any` types
- [ ] Action buttons wrapped in `<HasPermission>`
- [ ] API calls use the `request` instance from `shared/api/http-client.ts`
- [ ] Server data fetched via TanStack Query (not useEffect)
- [ ] Forms use antd Form, not RHF (unless explicitly added for a complex case)
- [ ] No hardcoded text — uses `t()` from i18next
- [ ] No hardcoded colors — uses theme tokens (not Tailwind color classes)
- [ ] Tailwind used only for layout (spacing, flex, grid, sizing) — no color/typography on theme-sensitive elements
- [ ] Date/time formatted via `formatDateTime()` from `shared/lib/format`
- [ ] Icons via `@iconify/react`
- [ ] No manual `useMemo` / `useCallback` unless profiler-justified (trust React Compiler)
- [ ] No mutation of state/props/destructured values during render
- [ ] Page wrapper in `src/pages/` matches `system_menu.component` for dispatcher resolution
- [ ] All file names kebab-case (including components, hooks, layouts, routes)
- [ ] No Chinese comments
- [ ] Deviations from yudao explicitly noted in code or PR description

## Deep Context

- Master architecture: `soar-be/docs/FE_Admin_Architecture_Plan.md`
- Phase 5A FE plan: `soar-fe/docs/PHASE_5A_FE_PLAN.md`
- Phase 5A summary (current baseline): `soar-fe/docs/PHASE_5A_SUMMARY.md`
- Phase 5A smoke test: `soar-fe/docs/PHASE_5A_SMOKE_TEST.md`
- Backend phase plan: `soar-be/docs/PHASE_PLAN.md`
- Backend decisions: `soar-be/docs/ARCHITECTURE_DECISIONS.md`
- Conventions detail: `CONVENTIONS.md`
- Task templates: `skills/` directory

> **Note**: `FE_Phase_5A_Scaffold_Spec.md` (from session S12) is **superseded** by `PHASE_5A_FE_PLAN.md` v2, `PHASE_5A_SUMMARY.md`, and this file. The scaffold spec contains outdated patterns (`VITE_DEFAULT_TENANT_ID` env var, circular import between http-client and error-interceptor, static `tab-registry.ts` instead of `import.meta.glob`). Read for intent only; follow this AGENTS.md + PHASE_5A_SUMMARY.md for actual decisions.
