# AGENTS.md — Soar Frontend

> Cross-tool standard. Read by Claude Code, Cursor, Codex, and any AI coding agent.
> Authoritative architecture spec: `soar-be/docs/FE_Admin_Architecture_Plan.md`. Read it first.
> Last reviewed: 2026-06-05 (session S12). Phase 5 scaffold pending.

## Project Overview

Soar frontend — React admin platform rebuilt from RuoYi-Vue-Pro / yudao Vue3 frontend.
Paired with `soar-be` (Spring Boot backend). Multi-tenant. Permission-driven UI from BE menu tree.

### Stack

- **React 19.2+** with TypeScript (strict mode)
- **Vite** (build tool, native ESM, fast HMR)
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

## Build & Run

```bash
pnpm install
pnpm dev           # Dev server (proxy /admin-api to soar-be on :8080)
pnpm build
pnpm type-check
pnpm test          # Vitest unit + integration
```

## Directory Structure

```
src/
├── app/                        # App infrastructure
│   ├── store.ts                # Redux store + persist config (sessionStorage)
│   ├── query-client.ts         # TanStack Query client
│   ├── providers.tsx           # Composed providers
│   └── slices/
│       ├── auth.slice.ts       # user, tokens, expiresTime
│       ├── menu.slice.ts       # flat list + tree of menus
│       ├── tabs.slice.ts       # openTabs + activeTabId (persisted)
│       └── theme.slice.ts      # 'light' | 'dark'
│
├── shared/                     # Cross-cutting, reusable
│   ├── api/
│   │   ├── http-client.ts      # axios instance
│   │   ├── interceptors/
│   │   │   ├── tenant-interceptor.ts
│   │   │   ├── auth-interceptor.ts
│   │   │   └── error-interceptor.ts  # CommonResult unwrap, single-flight refresh
│   │   └── types.ts            # CommonResult<T>, PageResult<T>, PageParam
│   ├── components/
│   │   ├── HasPermission.tsx
│   │   ├── DictTag.tsx
│   │   ├── DictSelect.tsx
│   │   └── TreeSelect.tsx
│   ├── hooks/
│   │   ├── useDict.ts
│   │   ├── usePagedQuery.ts
│   │   └── usePermission.ts
│   ├── lib/
│   │   ├── env.ts
│   │   ├── tenant.ts           # getTenantId, setTenantId
│   │   ├── token.ts
│   │   ├── format.ts           # formatDate, formatDateTime
│   │   └── permission-matcher.ts
│   └── i18n/
│       ├── config.ts
│       └── locales/{en,vi,zh-CN}.json
│
├── features/                   # Business code by domain
│   ├── system/
│   │   ├── user/
│   │   │   ├── api/index.ts        # userApi.page/get/create/update/delete
│   │   │   ├── types.ts            # UserListItemDTO, UserCreateReqDTO, ...
│   │   │   ├── components/
│   │   │   │   ├── user-list-page.tsx
│   │   │   │   ├── user-detail-page.tsx
│   │   │   │   ├── user-form-modal.tsx
│   │   │   │   └── user-search-form.tsx
│   │   │   └── hooks/
│   │   ├── role/
│   │   ├── dept/
│   │   ├── menu/
│   │   ├── dict/
│   │   └── tenant/
│   ├── infra/
│   └── auth/
│
├── pages/                      # Thin wrappers (~10 lines each) — dispatcher targets
│   ├── system/
│   │   ├── user/
│   │   │   ├── index.tsx       # → <UserListPage />
│   │   │   └── detail.tsx      # → <UserDetailPage />
│   │   ├── role/
│   │   │   └── index.tsx
│   │   └── ...
│   ├── infra/
│   ├── login.tsx
│   ├── forbidden.tsx
│   └── not-found.tsx
│
├── layouts/
│   ├── AppShell.tsx            # main shell with TabBar
│   ├── BlankLayout.tsx         # for login/forbidden
│   └── components/
│       ├── SiderMenu.tsx
│       ├── TabBar.tsx
│       ├── HeaderBar.tsx
│       └── TabRenderer.tsx     # glob loader + Suspense
│
└── routes/
    ├── index.tsx               # top-level <BrowserRouter>
    └── guards/
        └── AuthGuard.tsx
```

## Architecture Rules

### Import Direction

- `features/` → `shared/` ✅
- `pages/` → `features/` ✅ (pages are thin wrappers)
- `shared/` → `features/` ❌
- `features/A` → `features/B` ❌ (move to `shared/` if cross-feature)

### State Management Split

- **Redux Toolkit**: auth, permissions, menu tree, open tabs, theme
- **TanStack Query**: all server data (lists, details, mutations)
- **antd Form**: form state (local to each form)
- **`useState` in component**: table state (pageNo, pageSize, filters, sort) — **NOT URL-synced** (see decision §11.7 in Plan)

### URL pattern — flat with `?tab=<tab_key>`

This is critical and unusual. Read carefully.

- **All menu-triggered pages live at the single root path `/`**. No `/system/user`, no `/admin/dashboard`.
- URL shape: `/?tab=<tab_key>&<arbitrary params>`
  - `tab` = dispatcher key, matches `system_menu.tab_key`.
  - Other params (id, dictType, ...) flow to the component via context.
- `react-router-dom` is used only for `/login`, `/forbidden`, `/`, `/*`. Three or four top-level routes total.
- **`<Outlet>` is NOT used inside the main shell** — AppShell renders tabs directly from Redux state using a glob loader.
- See Plan §3 and §6 for the full mechanism and reasoning.

### Tabs view with React 19.2 `<Activity>`

- Each open tab is a record in `tabs.slice` (Redux), rendered inside `<Activity mode={isActive ? 'visible' : 'hidden'}>` if `menu.keepAlive` is true.
- Tabs persisted to **sessionStorage** (not localStorage) via redux-persist — per-browser-tab isolation.
- F5 keeps tabs. New browser-tab gets a fresh state.
- Phased rollout: Phase 5A (no tabs UI), 5B (tabs UI no keep-alive), 5C (Activity retrofit). Don't ship Activity until 5C.

### Permission-Driven UI

- `<HasPermission code="system:user:create">` — renders children only if user has permission.
- `usePermission()` hook — exposes `hasPermission(code)` method. Super admin wildcard `*:*:*` is handled inside.
- Sidebar rendered dynamically from menu tree API (`/get-permission-info`).
- AppShell looks up `menu.tab_key` from menus loaded post-login. URL with unknown `tab_key` → navigate `/forbidden`.

### API Conventions

- All API calls go through `shared/api/http-client.ts` (axios instance).
- Interceptors:
  - **Request**: attach `tenant-id` header (`getTenantId()`) + `Authorization` Bearer.
  - **Response**: unwrap `CommonResult` on `code === 0`. On `code === 401`, run single-flight refresh (port pattern from yudao `service.ts`). Other non-zero codes → reject with `Error(msg)`.
- API functions in `features/{module}/{entity}/api/index.ts`.
- TanStack Query keys: arrays with feature namespace, e.g., `['user', 'list', params]`, `['user', 'detail', id]`. Do NOT bake URL paths into keys.
- Backend action-path pattern (NOT REST):
  - `GET /admin-api/{module}/{entity}/page?pageNo=1&pageSize=10&...`
  - `GET /admin-api/{module}/{entity}/get?id=`
  - `POST /admin-api/{module}/{entity}/create`
  - `PUT /admin-api/{module}/{entity}/update`
  - `DELETE /admin-api/{module}/{entity}/delete?id=`
- Pagination params: `pageNo` (1-based), `pageSize`. NOT `page`/`size`/`current`.
- File upload: `POST /admin-api/infra/file/upload` (multipart, field `file` + optional `directory`); returns access URL.

### Tenant-id header

- Every request sends `tenant-id` header. Helper: `getTenantId()` reads localStorage, falls back to `VITE_DEFAULT_TENANT_ID`.
- Login itself REQUIRES `tenant-id`. BE will reject with 400 if missing.
- See Plan §7.4 for the multi-tenant future flow (currently single-tenant default `1`).

### Refresh token — single-flight

Port pattern from yudao `service.ts`. Module-level state `isRefreshing` + `requestQueue`. First 401 triggers refresh; subsequent 401s during refresh are queued and replayed. See Plan §7.1 for full code.

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
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
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

- File naming: **kebab-case** (`user-list-page.tsx`, `dict-select.tsx`).
- Component naming: **PascalCase** in code (`UserListPage`, `DictSelect`).
- Type suffix: **DTO** (matching BE), e.g., `UserListItemDTO`, `UserCreateReqDTO`.
- Comments: **English only**. JSDoc on exported components, hooks, and non-trivial functions.
- No hardcoded colors. Use `theme.useToken()` from antd or `style={{ color: token.colorX }}`. **Never** use Tailwind color classes (`bg-white`, `text-gray-900`, `bg-blue-500`) on theme-sensitive elements.
- Tailwind v4 is used for layout primitives only: spacing (`p-4`, `gap-2`), sizing (`w-full`), flex/grid (`flex items-center`), positioning. NOT for colors. See CONVENTIONS §Styling.
- No hardcoded text strings in JSX. Use `t('key.path')` from i18next.

## Don't

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

## Verification Checklist

- [ ] `pnpm type-check` passes
- [ ] `pnpm build` succeeds
- [ ] No `any` types
- [ ] Action buttons wrapped in `<HasPermission>`
- [ ] API calls use `shared/api/http-client.ts` instance
- [ ] Server data fetched via TanStack Query (not useEffect)
- [ ] Forms use antd Form, not RHF (unless explicitly added for a complex case)
- [ ] No hardcoded text — uses `t()` from i18next
- [ ] No hardcoded colors — uses theme tokens (not Tailwind color classes)
- [ ] Tailwind used only for layout (spacing, flex, grid, sizing) — no color/typography on theme-sensitive elements
- [ ] Date/time formatted via `formatDateTime()` from `shared/lib/format`
- [ ] Icons via `@iconify/react`
- [ ] Page wrapper in `src/pages/` matches `system_menu.component` for dispatcher resolution

## Deep Context

- Master architecture: `soar-be/docs/FE_Admin_Architecture_Plan.md`
- Backend phase plan: `soar-be/docs/PHASE_PLAN.md`
- Backend decisions: `soar-be/docs/ARCHITECTURE_DECISIONS.md`
- BE V1_0_8 changes (tab_key, tenant endpoints): `soar-be/docs/BE_Spec_V1_0_8_Changes.md`
- Task templates: `skills/` directory
