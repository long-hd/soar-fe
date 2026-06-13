# Soar Frontend — Architecture Snapshot

> Living document. Describes the **current state** of the Soar frontend at end of Phase 5B Task 2 (2026-06-13).
>
> - For **decision rationale**, see `docs/decisions/adr/`.
> - For **coding conventions**, see `CONVENTIONS.md`.
> - For **agent operational rules**, see `AGENTS.md`.
> - For **task-level deliberations**, see `docs/decisions/tasks/`.
> - For **planning intent (before-build)**, see `docs/plans/fe-admin-architecture-plan.md`.

This file answers: _what does the system look like today?_ New devs or agents read this first to orient.

---

## System overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Soar FE (React 19.2 + Vite 8 + antd v6)                   │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  AppShell (3-pane: header + sider + content)        │   │  │
│  │  │  ┌────────────────────────────────────────────────┐ │   │  │
│  │  │  │  TabRenderer  ─── import.meta.glob dispatch    │ │   │  │
│  │  │  │  <Activity>   ─── keep-alive per-tab           │ │   │  │
│  │  │  └────────────────────────────────────────────────┘ │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                            │  │
│  │  State: Redux Toolkit (auth, menus, tabs, theme)           │  │
│  │       + TanStack Query (server data)                       │  │
│  │  Persist: localStorage (auth, tenantId, theme)             │  │
│  │         + sessionStorage (open tabs)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            │ axios `request` + interceptors      │
│                            │ tenant-id + Authorization headers   │
│                            ▼                                     │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Soar BE (Spring Boot 3.5 + JPA + PostgreSQL)                    │
│                                                                  │
│  Endpoints:    /admin-api/{module}/{entity}/{action}             │
│  Response:     CommonResult<T> { code, data, msg }               │
│  Auth:         opaque tokens (access + refresh)                  │
│  Multi-tenant: tenant-id header (resolved from website host)     │
└──────────────────────────────────────────────────────────────────┘
                             │
                             │ S3-compatible (SeaweedFS dev / S3 prod)
                             ▼
                       ┌─────────────────┐
                       │ Object Storage  │
                       │ (file uploads)  │
                       └─────────────────┘
```

**Key shape**:

- Single browser-tab can host multiple admin tabs (TabBar UI). Each tab keep-alived via React 19.2 `<Activity>`.
- All menu-triggered pages live at one URL path `/`. Differentiation by `?tab=<tab_key>`.
- FE owns no business logic — pure transport + presentation. BE is the source of truth for permissions, menus, dicts, data.

---

## Stack

| Layer          | Library                       | Version | Role                                                |
| -------------- | ----------------------------- | ------- | --------------------------------------------------- |
| UI framework   | React                         | 19.2.6  | Component model                                     |
| Build          | Vite                          | 8.0.12  | Bundler + dev server (Rolldown)                     |
| Compiler       | babel-plugin-react-compiler   | latest  | Auto-memoization (no manual useMemo/useCallback)    |
| UI library     | antd                          | 6.4.3   | Components (Table, Form, Modal, Menu, ...)          |
| State (client) | Redux Toolkit + redux-persist | latest  | auth, menus, tabs, theme                            |
| State (server) | @tanstack/react-query         | v5      | List/detail/mutation cache                          |
| Routing        | react-router-dom              | 7.17    | 4 top-level routes (login, /, /forbidden, /\*)      |
| HTTP           | axios                         | 1.17    | Single `request` instance + custom paramsSerializer |
| i18n           | i18next + react-i18next       | 26 + 17 | per-domain JSON files + single runtime namespace    |
| Date           | dayjs                         | 1.11    | antd v6 default; UTC + timezone plugins             |
| Icons          | @iconify/react                | latest  | Iconify strings matching BE seed (mdi:_, ep:_, ...) |
| Styling        | Tailwind CSS                  | v4      | Layout primitives ONLY (no theme-aware colors)      |
| Test           | Vitest                        | 4       | Unit + integration                                  |

**NOT in stack** (deliberately rejected): shadcn/ui, ProComponents, react-hook-form + zod baseline, TanStack Router, Lucide/Heroicons/antd Icons, web-storage-cache. See AGENTS.md § NOT in the stack.

---

## Module map

```
src/
├── app/                        # App infrastructure
│   ├── store.ts                # Redux store + redux-persist config
│   ├── query-client.ts         # TanStack Query client config
│   ├── providers.tsx           # Composed providers (Redux, QueryClient, antd <App>, ConfigProvider)
│   └── slices/
│       ├── auth-slice.ts       # user, tokens, permissions, menus (→ localStorage)
│       ├── tags-view-slice.ts  # open tabs + active tab (→ sessionStorage)
│       └── theme-slice.ts      # 'light' | 'dark' + siderCollapsed
│
├── shared/                     # Cross-cutting, reusable
│   ├── api/
│   │   ├── http-client.ts      # axios `request` + paramsSerializer (ADR 0006)
│   │   ├── types.ts            # CommonResult<T>, PageResult<T>, SortParams, AuthTokensDTO
│   │   ├── interceptors/
│   │   │   ├── auth-interceptor.ts   # 401 → single-flight refresh + replay queue
│   │   │   └── error-interceptor.ts  # CommonResult code validation + toast
│   │   └── lookup/             # cross-cutting BE lookup API clients
│   │       ├── dict.ts, dept.ts, post.ts
│   ├── components/
│   │   ├── dict-tag.tsx        # colored badge from dict
│   │   ├── dict-select.tsx     # antd Select bound to dict
│   │   ├── dept-tree-select.tsx
│   │   └── post-select.tsx     # single + multiple modes
│   ├── hooks/
│   │   ├── use-dict-data.ts    # fetch dict by type, memoized
│   │   ├── use-dept-tree.ts    # fetch + build tree
│   │   ├── use-post-list.ts
│   │   ├── use-paged-query.ts  # TanStack Query → antd Table props
│   │   └── use-table-state.ts  # in-memory pagination + filters + sort (no URL sync)
│   ├── lib/
│   │   ├── env.ts              # VITE_API_BASE_URL access
│   │   ├── tenant.ts           # localStorage I/O for tenantId
│   │   ├── token.ts            # localStorage I/O for tokens
│   │   ├── format.ts           # formatDate, formatDateTime
│   │   ├── permission-matcher.ts # *:*:* wildcard logic
│   │   ├── tree.ts             # generic tree builder
│   │   └── antd-app-ref.ts     # antdApp proxy for non-React callers
│   ├── i18n/
│   │   ├── index.ts            # i18next init
│   │   ├── resource/
│   │   │   ├── resource.en.ts  # spread merge of locales/en/*.json
│   │   │   └── resource.vi.ts
│   │   ├── types.d.ts          # type augmentation from JSON imports
│   │   └── locales/
│   │       ├── en/{common,app-shell,system-user,...}.json
│   │       └── vi/{...}.json
│   └── types/api.ts            # SortParams + general API types
│
├── features/                   # Business code by domain
│   ├── auth/                   # Login, tenant-boot-gate, token refresh
│   ├── permission/             # <HasPermission>, usePermission (consumed by other features)
│   └── system/
│       └── user/               # canonical CRUD reference (complete)
│
├── pages/                      # Thin wrappers for import.meta.glob dispatch
│   ├── system/user/index.tsx   # → <UserListPage />
│   ├── system/role/index.tsx   # → placeholder (TR-pre pending)
│   ├── login/login-page.tsx
│   └── error/{forbidden,not-found,tenant-error}.tsx
│
├── layouts/
│   ├── app-shell.tsx           # main shell (header + sider + content)
│   ├── blank-layout.tsx        # for login, forbidden, tenant-error
│   └── components/
│       ├── sider-menu.tsx
│       ├── tab-bar.tsx
│       ├── header-bar.tsx
│       └── tab-renderer.tsx    # import.meta.glob + <Activity> keep-alive
│
└── routes/
    ├── router.tsx              # createBrowserRouter — 4 top-level routes
    └── guards/auth-guard.tsx
```

---

## Cross-cutting concerns

### App boot flow

1. **`main.tsx`** mounts `<Providers>` (Redux + QueryClient + antd `<App>` + ConfigProvider + i18next + ErrorBoundary).
2. **`<TenantBootGate>`** mounts first inside Providers. Calls `GET /admin-api/system/tenant/get-by-website?website=${location.host}` (the ONLY endpoint that doesn't require `tenant-id` header, marked `@PermitAll` + `@TenantIgnore` on BE).
   - Success → `setTenantId(res.id)` to localStorage. Continue boot.
   - Miss → render `tenant-error.tsx`. Boot halts.
3. **`<AuthGuard>`** checks Redux `auth-slice` for valid access token.
   - Has token → render `<AppShell>`.
   - No token → redirect to `/login`.
4. **Post-login**: `loginThunk` fetches `/auth/login` → stores tokens. Then `getPermissionInfo` fetches user/menus/permissions → populates auth-slice.
5. **`<AppShell>`** renders header + sider + content area. Sider built from menu tree. Content area = `<TabBar>` + `<TabRenderer>`.

### URL dispatch — `?tab=<tab_key>` flat pattern

Reference: ADR 0001.

- All menu-triggered pages live at single root path `/`. URL shape: `/?tab=<tab_key>&<extra params>`.
- `tab_key` is a flat namespace per tenant. Seeded by BE `system_menu.tab_key VARCHAR(100)`.
- `<TabRenderer>` reads:
  - active tab from `tags-view-slice`
  - menu list from `auth-slice`
- Finds menu row matching active `tab_key`, extracts `component` field (e.g., `system/user/index`)
- Resolves via `import.meta.glob('/src/pages/**/*.tsx')` → renders matched module's default export
- Wraps in `<Activity mode="visible|hidden">` per `menu.keepAlive` flag
- Extra URL params flow to component via `TabParamsContext`

**`react-router-dom`** only handles 4 routes: `/login`, `/`, `/forbidden`, `/*`. No `<Outlet>` in main shell — `TabRenderer` directly renders from glob.

### State management

| Concern                           | Store                   | Persistence                        |
| --------------------------------- | ----------------------- | ---------------------------------- |
| auth, tokens, permissions, menus  | Redux `auth-slice`      | localStorage (cross-tab)           |
| Open tabs, active tab             | Redux `tags-view-slice` | sessionStorage (per-browser-tab)   |
| Theme + siderCollapsed            | Redux `theme-slice`     | localStorage                       |
| Lists, details, dict, dept, post  | TanStack Query          | In-memory (no persist; see A2-TD1) |
| Form state                        | antd Form local         | None                               |
| Table pagination + filters + sort | `useTableState`         | In-memory (see A5-TD1)             |

**Why not URL-sync table state**: per ADR / Plan §11.7. Activity keep-alive preserves across tab switches; F5 resets is acceptable. URL sync deferred until share-link UX demand surfaces.

### HTTP layer

Reference: ADR 0002, ADR 0006.

- Single axios instance `request` from `shared/api/http-client.ts`.
- **Request interceptor** (`auth-interceptor.request`): attach `tenant-id` + `Authorization: Bearer <access>`. Skip `tenant-id` for `/get-by-website` endpoint only.
- **Response interceptor** (`error-interceptor`): validate `CommonResult.code`. Pass through on `code === 0`. On other codes, toast `msg` via `antdApp.message.error` + reject with `Error(msg)`.
- **401 handler** (`auth-interceptor.response`): single-flight refresh. Module-level `isRefreshing` + `requestQueue`. First 401 triggers refresh; subsequent 401s queue + replay. Refresh request uses bare axios (no interceptor chain) to avoid recursion. `_isRetry` flag prevents infinite loop.
- **paramsSerializer**: custom shape detection per-key (ADR 0006).
  - Primitive array (`ids: number[]`, `createTime: string[]`) → `repeat` format → `?ids=1&ids=2`
  - POJO array (`sortingFields: SortParams[]`) → `allowDots: true` → `?sortingFields[0].field=createTime&sortingFields[0].order=desc`
- **Unwrap pattern** (ADR 0002): API methods end with `.then(r => r.data.data)`. Interceptor preserves response shape.

### i18n architecture

Reference: ADR 0003.

- Per-domain JSON files: `locales/<lang>/<domain>.json` (e.g., `system-user.json`).
- Each file has 1 top-level key matching domain camelCase: `system-user.json` → `{ "systemUser": { ... } }`.
- Runtime merge in `resource.<lang>.ts`: spread imports into single `translation` namespace.
- Single `useTranslation()` call site — no namespace argument needed: `t('systemUser.form.username')`, `t('common.cancel')`.
- Type safety via TS intersection of JSON imports in `types.d.ts`. Autocomplete + typo detection for every key.
- Languages: EN + VI. Translator-friendly file split.

### Permission model

Reference: ADR 0001 (BE-driven menu), AGENTS.md § Permission-Driven UI.

- Permissions = flat strings, format `<module>:<entity>:<action>` (e.g., `system:user:create`).
- BE source of truth: `/admin-api/system/permission/get-info` returns `{ user, roles, permissions[], menus[] }` post-login.
- Stored in Redux `auth-slice.permissions`.
- Gating tools (from `@/features/permission`):
  - `<HasPermission code="X">` — conditional render
  - `<HasPermission code="X" fallback={...}>` — degrade gracefully
  - `usePermission()` — programmatic `hasPermission(code)` check
- Super admin wildcard `*:*:*` handled in matcher (defensive).
- Sider menu auto-filtered server-side (BE only returns menus the user can access). No client-side double-filter (A1-TD1 acceptable).

### Activity keep-alive

- React 19.2 `<Activity mode={isActive ? 'visible' : 'hidden'}>`.
- `<TabRenderer>` wraps each open tab in `<Activity>` if `menu.keepAlive === true`.
- Hidden tabs stay mounted — state preserved (form values, scroll position, table page).
- Visible tab paints; hidden tabs throttle render cycles.
- Tab close: remove from `tags-view-slice` → component unmounts → state lost (expected).

### tenant-id resolution

- Every authenticated request sends `tenant-id` header. Helper: `getTenantId()` reads localStorage.
- **No env var fallback** — if storage empty, request should not be sent. Boot order must resolve tenant first via `tenant-boot-gate`.
- The `/get-by-website` endpoint is `@PermitAll` + `@TenantIgnore` on BE.
- For dev: seed `system_tenant.websites` with `localhost:5173`, `localhost:4173`. For prod: append production hostnames.

### Refresh token

- Single-flight pattern. Module-level `isRefreshing` + `requestQueue` in `auth-interceptor`.
- First 401 → trigger refresh (bare axios call, no interceptor chain).
- Subsequent 401s during refresh → queue.
- Refresh success → update tokens in Redux + storage + replay queued requests.
- Refresh fail → `handleAuthorized()` (Modal.confirm via `antdApp` "Session expired" + dispatch logout via dynamic import to avoid circular dep).
- `_isRetry` flag on request config prevents infinite loop if BE keeps returning 401 after refresh.

---

## Feature inventory

| Feature                   | State                                   | Notes                                                                                                                                                            |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/auth/`          | Complete                                | Login, token refresh, tenant-boot-gate                                                                                                                           |
| `features/permission/`    | Complete                                | `<HasPermission>`, `usePermission`, wildcard matcher                                                                                                             |
| `features/system/user/`   | **Complete (canonical CRUD reference)** | Full CRUD page + form + reset-password + 6 mutations + sortable + bulk delete + self-protection + status toggle. Used as `skills/crud-page/_example/` reference. |
| `features/system/role/`   | Stub                                    | Wrapper `pages/system/role/index.tsx` exists; feature folder empty. Next port-loop block (TR-pre).                                                               |
| `features/system/dept/`   | Not started                             | Tree variant — separate skill needed.                                                                                                                            |
| `features/system/menu/`   | Not started                             | Tree variant.                                                                                                                                                    |
| `features/system/post/`   | Not started                             | Simplest CRUD (flat, no dict). Use lookup `shared/api/lookup/post.ts` already exists.                                                                            |
| `features/system/dict/`   | Not started                             | Linked-entity variant (dict-type + dict-data).                                                                                                                   |
| `features/system/tenant/` | Not started                             | Multi-tenant admin (sensitive — defer).                                                                                                                          |
| `features/infra/`         | Not started                             | File upload, config, log viewer, job logs.                                                                                                                       |

---

## Foundation infrastructure (`shared/`)

Reusable building blocks consumed by features. Owned by `shared/`.

### `shared/components/`

| Component          | Purpose                               | Consumed by                            |
| ------------------ | ------------------------------------- | -------------------------------------- |
| `<DictTag>`        | Colored badge from dict-typed value   | Table column renderers                 |
| `<DictSelect>`     | antd Select bound to a dict type      | Forms (with DictSelect tax — ADR 0004) |
| `<DeptTreeSelect>` | Dept hierarchy picker                 | Forms with `deptId` field              |
| `<PostSelect>`     | Post picker (single + multiple modes) | Forms with `postIds` field             |

### `shared/hooks/`

| Hook                                                   | Purpose                                         |
| ------------------------------------------------------ | ----------------------------------------------- |
| `useDictData(type)`                                    | Fetch dict by type via TanStack Query, memoized |
| `useDeptTree()`                                        | Fetch dept list + build tree, memoized          |
| `usePostList()`                                        | Fetch flat post list                            |
| `usePagedQuery({ baseQueryKey, queryFn, tableState })` | Compose TanStack Query + antd Table props       |
| `useTableState<TFilters>(init, sort?)`                 | Pagination + filters + sort in-memory           |

### `shared/lib/`

| Module                  | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `tenant.ts`             | localStorage I/O for `tenantId`                                    |
| `token.ts`              | localStorage I/O for access + refresh tokens                       |
| `format.ts`             | `formatDate`, `formatDateTime` (dayjs + UTC + tz)                  |
| `permission-matcher.ts` | `*:*:*` wildcard logic                                             |
| `tree.ts`               | Generic flat-to-tree builder                                       |
| `antd-app-ref.ts`       | `antdApp` proxy for non-React callers (interceptors, util modules) |
| `env.ts`                | `VITE_API_BASE_URL` typed access                                   |

### `shared/api/`

| Module                                 | Purpose                                             |
| -------------------------------------- | --------------------------------------------------- |
| `http-client.ts`                       | `request` axios instance + paramsSerializer         |
| `types.ts`                             | `CommonResult<T>`, `PageResult<T>`, `AuthTokensDTO` |
| `interceptors/auth-interceptor.ts`     | 401 single-flight refresh                           |
| `interceptors/error-interceptor.ts`    | code validation + toast                             |
| `lookup/dict.ts`, `dept.ts`, `post.ts` | Cross-cutting BE lookup endpoints                   |

### `shared/i18n/`

| Module                        | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `index.ts`                    | i18next init + language detector                          |
| `resource/resource.<lang>.ts` | Spread-merge per-domain JSON imports                      |
| `types.d.ts`                  | TS intersection of all JSON shapes for `t()` autocomplete |
| `locales/<lang>/`             | Per-domain translation files                              |

---

## Build pipeline

### Dev (`pnpm dev`)

- Vite 8 dev server on port 5173
- Rolldown bundler (fast HMR)
- React Compiler runs during transform (auto-memoization)
- BE handles CORS via `Access-Control-Allow-Origin` matching `localhost:*` — NO Vite proxy

### Build (`pnpm build`)

- Vite production build
- React Compiler runs at build time
- Output to `dist/`

### Type-check (`pnpm type-check`)

- `tsc --noEmit` with `strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`
- i18n key autocomplete + type safety via `types.d.ts` intersection

### Test (`pnpm test`)

- Vitest
- Currently sparse (`shared/lib/sanity.test.ts`, `app/slices/tags-view-slice.test.ts`) — expansion is future polish

---

## Phase state

**Current**: end of Phase 5B Task 2 (2026-06-13).

| Phase                     | Status   | Output                                                                                                      |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| 5A                        | Complete | Scaffold + 4 routes + auth + HTTP layer + Redux + TanStack baseline. See `docs/phases/phase-5a-summary.md`. |
| 5B-foundation (A0-A5, AA) | Complete | Activity keep-alive, permission infra, dict/dept/post infra, useTableState, tech debt tracker.              |
| 5B-tagsView (T1.0-T1.3)   | Complete | TabBar + Redux slice + dispatcher wiring.                                                                   |
| 5B-Task 2 (T2.0-T2.5)     | Complete | system/user CRUD (canonical reference). 6 ADRs + skill folder + doc reorg.                                  |
| 5B-port loop              | **Next** | TR-pre (system/role) → TR → TD (dept tree) → TT (dict linked) → TM (menu tree) → TP (post).                 |
| 5C                        | Future   | Polish: ErrorBoundary, i18n batch (#14), tenant edge cases, sessionStorage lookup persist.                  |

### Tech debt summary

- 32 open (0 high, 5 medium, 27 low)
- 12 resolved
- See `TECH_DEBT.md` for full ledger.

---

## ADR index

Architectural decisions, append-only.

| #    | Title                                               | Tags          |
| ---- | --------------------------------------------------- | ------------- |
| 0001 | Tab-key URL pattern + flat routing dispatcher       | routing       |
| 0002 | API method unwraps `CommonResult` internally        | http          |
| 0003 | i18n single-namespace + per-domain file split       | i18n          |
| 0004 | DictSelect string-boundary (form↔domain conversion) | forms, dict   |
| 0005 | Mutations no callback — caller chains               | data-fetching |
| 0006 | paramsSerializer split for mixed array shapes       | http          |

See `docs/decisions/adr/` for individual files.

---

## Skill folder

For agent-driven CRUD page creation, the skill at `skills/crud-page/` operationalizes patterns. Workflow:

```
1. skills/crud-page/README.md           # Entry point + agent prompt template
2. skills/crud-page/be-extraction.md    # BE controller → FE inputs mapping
3. skills/crud-page/decisions.md        # Decision tree for variants
4. skills/crud-page/steps.md            # 9-step build with file templates
5. skills/crud-page/_example/           # Sanitized system/user reference
```

First validation block: TR-pre (system/role) — first port-loop attempt using this skill.

---

## Where to find more

| Question                                   | File                                       |
| ------------------------------------------ | ------------------------------------------ |
| Why was decision X made?                   | `docs/decisions/adr/<NNNN>-*.md`           |
| How was task Y built?                      | `docs/decisions/tasks/<phase>/<task>.md`   |
| Master architecture intent (before-build)? | `docs/plans/fe-admin-architecture-plan.md` |
| Original Phase 5A spec?                    | `docs/phases/fe-phase-5a-scaffold-spec.md` |
| Phase 5A retrospective?                    | `docs/phases/phase-5a-summary.md`          |
| Phase 5A smoke test reference?             | `docs/phases/phase-5a-smoke-test.md`       |
| Phase 5B kickoff decisions?                | `docs/plans/phase-5b-kickoff.md`           |
| Code style + naming + patterns?            | `CONVENTIONS.md`                           |
| Agent operational rules?                   | `AGENTS.md`                                |
| Tech debt items?                           | `TECH_DEBT.md`                             |
| How to build a CRUD page (agent)?          | `skills/crud-page/README.md`               |
| BE architecture, decisions, phases?        | `../soar-be/docs/`                         |

---

## Maintenance

This file is a **living snapshot**. Update when:

- New foundation infrastructure lands (new `shared/` hook/component/lib)
- New feature module is added (update Feature inventory table)
- Cross-cutting concern changes (e.g., new interceptor, refactored boot flow)
- Phase transitions (update Phase state)
- ADR is added/superseded (update ADR index)
- Tech debt summary numbers change meaningfully

**Don't** mirror everything from ADRs / CONVENTIONS — this file describes current STATE; those describe DECISIONS + RULES. Point to them.

**Last update**: 2026-06-13 (end of Phase 5B Task 2; port loop pending).
