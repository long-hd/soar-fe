# AGENTS.md — Soar Frontend

> Cross-tool standard. Read by Claude Code, Cursor, Codex, and any AI coding agent.
> Authoritative architecture spec: `docs/plans/fe-admin-architecture-plan.md`. Read it first.
> Last reviewed: 2026-06-13 (Phase 5B Task 2 complete). See `docs/phases/phase-5a-summary.md` for the Phase 5A baseline; in-progress Phase 5B tasks documented under `docs/decisions/tasks/5b/`.

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
- **i18next** + **react-i18next** (key-driven, per-domain JSON files merged into single `translation` namespace)
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
│   ├── providers.tsx           # Composed providers (incl. antd <App>)
│   └── slices/
│       ├── auth-slice.ts       # user, tokens, permissions, menus (localStorage)
│       ├── tags-view-slice.ts  # openTabs + activeTabId (sessionStorage)
│       └── theme-slice.ts      # 'light' | 'dark'
│
├── shared/                     # Cross-cutting, reusable
│   ├── api/
│   │   ├── http-client.ts      # axios instance `request` + custom paramsSerializer
│   │   ├── types.ts            # CommonResult<T>, PageResult<T>, PageParam, SortParams, AuthTokensDTO
│   │   └── interceptors/
│   │       ├── auth-interceptor.ts   # 401 → single-flight refresh + replay queue
│   │       └── error-interceptor.ts  # CommonResult code validation, non-zero toast via antdApp
│   ├── components/
│   │   ├── dict-tag.tsx        # colored badge from dict
│   │   ├── dict-select.tsx     # antd Select bound to dict
│   │   ├── dept-tree-select.tsx
│   │   └── post-select.tsx
│   ├── hooks/
│   │   ├── use-dict-data.ts
│   │   ├── use-dept-tree.ts
│   │   ├── use-post-list.ts
│   │   ├── use-paged-query.ts
│   │   └── use-table-state.ts
│   ├── lib/
│   │   ├── env.ts
│   │   ├── tenant.ts           # localStorage I/O for tenantId — NO env var fallback
│   │   ├── token.ts            # localStorage I/O for access + refresh tokens
│   │   ├── format.ts           # formatDate, formatDateTime
│   │   ├── permission-matcher.ts
│   │   └── antd-app-ref.ts     # antdApp proxy for non-React callers
│   └── i18n/
│       ├── index.ts            # i18next init + per-domain merge
│       ├── resource/
│       │   ├── resource.en.ts  # spread merge of locales/en/*.json
│       │   └── resource.vi.ts
│       ├── types.d.ts          # type augmentation from JSON imports
│       └── locales/
│           ├── en/             # common.json, app-shell.json, system-user.json, ...
│           └── vi/             # mirror
│
├── features/                   # Business code by domain
│   ├── auth/
│   │   ├── api/index.ts
│   │   ├── components/tenant-boot-gate.tsx
│   │   └── types.ts
│   ├── permission/
│   │   ├── components/has-permission.tsx
│   │   ├── hooks/use-permission.ts
│   │   └── index.ts            # barrel — single feature with cross-cutting role
│   ├── system/
│   │   ├── user/               # canonical CRUD feature shape
│   │   │   ├── api/index.ts                              # userApi
│   │   │   ├── components/                               # sub-pieces composed by page
│   │   │   │   ├── user-form-modal.tsx
│   │   │   │   ├── user-reset-password-modal.tsx
│   │   │   │   └── user-search-form.tsx
│   │   │   ├── constants.ts                              # USER_PERMISSIONS, USER_DICT_TYPES, UserStatus
│   │   │   ├── hooks/index.ts                            # sysUserQueryKey, useUserDetailQuery, useUserMutations
│   │   │   ├── pages/user-list-page.tsx                  # orchestrating component
│   │   │   └── types.ts                                  # UserRespDTO, UserSaveReqDTO, UserFilters, ...
│   │   ├── role/
│   │   ├── dept/
│   │   ├── menu/
│   │   ├── dict/
│   │   └── tenant/
│   └── infra/
│
├── pages/                      # Thin wrappers — dispatcher targets for import.meta.glob
│   ├── system/user/index.tsx   # → <UserListPage />
│   ├── system/role/index.tsx
│   ├── login/login-page.tsx
│   └── error/{not-found,forbidden,tenant-error}.tsx
│
├── layouts/
│   ├── app-shell.tsx           # main shell (header + sider + content). NO <Outlet> for menu content.
│   ├── blank-layout.tsx        # for login/forbidden/tenant-error
│   └── components/
│       ├── sider-menu.tsx
│       ├── tab-bar.tsx
│       ├── header-bar.tsx
│       └── tab-renderer.tsx    # import.meta.glob + <Activity> keep-alive
│
└── routes/
    ├── router.tsx              # top-level createBrowserRouter — 4 routes
    └── guards/auth-guard.tsx
```

**Feature folder rules**:

- `api/index.ts` — single file per feature. Multiple files only when a feature genuinely spans multiple entities (rare).
- `components/` — sub-pieces composed by the page (modals, forms, columns). NOT the orchestrating component.
- `pages/` — the orchestrating page component (one per top-level entity). Page imports components, never reverse.
- `hooks/index.ts` — query keys + queries + collected mutations.
- `constants.ts` — permission codes, dict types, enum value mirrors.
- `types.ts` — flat by default. Use `types/<entity>-types.ts` subfolder only when feature has >1 entity OR file >200 lines.
- No `index.ts` barrel at feature root — pages import explicit paths.

## Architecture Rules

### Import Direction

- `features/` → `shared/` ✅
- `pages/` → `features/` ✅ (pages are thin wrappers)
- `layouts/` → `features/` → `shared/` ✅
- `shared/` → `features/` ❌
- `features/A` → `features/B` ❌ (move to `shared/` if cross-feature; exception: `features/permission` is consumed by other features)

### State Management Split

- **Redux Toolkit**: auth, permissions, menu tree, open tabs, theme
- **TanStack Query**: all server data (lists, details, mutations)
- **antd Form**: form state (local to each form)
- **`useTableState` hook (useState internally)**: table state (pageNo, pageSize, filters, sort) — **NOT URL-synced** (see decision §11.7 in Plan)

### Persistence Split

- **localStorage** (cross-tab session): `auth-slice` (tokens, permissions, menus), `tenantId`, `theme-slice`.
- **sessionStorage** (per-browser-tab): `tags-view-slice` (open tabs + active tab). F5 keeps tabs; new browser-tab starts fresh.
- Both wired via `redux-persist` per-slice transform.

### URL pattern — flat with `?tab=<tab_key>`

This is critical and unusual. Read carefully. See also ADR 0001.

- **All menu-triggered pages live at the single root path `/`**. No `/system/user`, no `/admin/dashboard`.
- URL shape: `/?tab=<tab_key>&<arbitrary params>`
  - `tab` = dispatcher key, matches `system_menu.tab_key`.
  - Other params (id, dictType, ...) flow to the component via context.
- `react-router-dom` is used only for `/login`, `/forbidden`, `/`, `/*`. Four top-level routes total.
- **`<Outlet>` is NOT used inside the main shell** — AppShell renders tabs directly from Redux state using a glob loader.
- Page file lookup: BE menu DTO returns `component` field (e.g., `system/user/index`). `tab-renderer.tsx` runs `import.meta.glob('/src/pages/**/*.tsx')` and resolves the path. Two dispatcher keys: `tab_key` (URL) + `component` (file path).
- See Plan §3 and §6 for the full mechanism.

### Tabs view with React 19.2 `<Activity>`

- Each open tab is a record in `tags-view-slice` (Redux), rendered inside `<Activity mode={isActive ? 'visible' : 'hidden'}>` if `menu.keepAlive` is true.
- Tabs persisted to **sessionStorage** (not localStorage) via redux-persist — per-browser-tab isolation.
- F5 keeps tabs. New browser-tab gets a fresh state.
- Activity keep-alive is ACTIVE (shipped Phase 5B foundation block A0).

### Permission-Driven UI

- `<HasPermission code="system:user:create">` — renders children only if user has permission.
- `usePermission()` hook — exposes `hasPermission(code)` method. Super admin wildcard `*:*:*` is handled inside.
- Sidebar rendered dynamically from menu tree API (`/get-permission-info`).
- AppShell looks up `menu.tab_key` from menus loaded post-login. URL with unknown `tab_key` → render not-found in content area (do NOT navigate `/forbidden` — that's for missing role, not missing tab).
- Both `HasPermission` + `usePermission` exported from `@/features/permission` barrel.

### API Conventions

- All API calls go through the axios instance `request` from `shared/api/http-client.ts`.
- Custom `paramsSerializer` detects primitive arrays (`repeat` format) vs POJO arrays (`allowDots+indices`) per-key. See ADR 0006.
- Interceptors:
  - **Request**: attach `tenant-id` header + `Authorization: Bearer <access>`. If `tenantId` null, do not attach — the only allowed request without `tenant-id` is `/system/tenant/get-by-website`.
  - **Response — auth-interceptor**: on `CommonResult.code === 401`, run single-flight refresh + replay queued requests.
  - **Response — error-interceptor**: validate `CommonResult.code`. On `code === 0`, pass through (callers explicitly `.then(r => r.data.data)`). Non-zero codes → toast `msg` via `antdApp.message.error` + reject with `Error(msg)`.
- API functions in `features/{module}/{entity}/api/index.ts`. Each method declares unwrapped return type and ends with `.then(r => r.data.data)`. See ADR 0002.
- TanStack Query keys: object factory `sysXxxQueryKey = { all: [...], detail: id => [...] }`. NOT inline arrays at usage sites.
- Backend action-path pattern (NOT REST):
  - `GET /admin-api/{module}/{entity}/page?pageNo=1&pageSize=10&...`
  - `GET /admin-api/{module}/{entity}/get?id=`
  - `POST /admin-api/{module}/{entity}/create`
  - `PUT /admin-api/{module}/{entity}/update`
  - `DELETE /admin-api/{module}/{entity}/delete?id=`
  - `DELETE /admin-api/{module}/{entity}/delete-list?ids=` (optional)
  - `PUT /admin-api/{module}/{entity}/update-status` (optional)
  - `PUT /admin-api/{module}/{entity}/update-password` (optional, user-like only)
- Pagination params: `pageNo` (1-based), `pageSize`. NOT `page`/`size`/`current`.
- File upload: `POST /admin-api/infra/file/upload` (multipart, field `file` + optional `directory`); returns access URL.

### Tenant-id resolution

- Every authenticated request sends `tenant-id` header. Helper: `getTenantId()` reads `localStorage`. **No env var fallback** — if storage is empty, request should not be sent.
- **App boot flow**: `tenant-boot-gate.tsx` mounts first, calls `GET /admin-api/system/tenant/get-by-website?website=${location.host}`. On success, `setTenantId(res.id)`. On miss, render `tenant-error.tsx`.
- The endpoint `/get-by-website` is `@PermitAll` + `@TenantIgnore` on BE — only request that runs without `tenant-id`.
- Login itself REQUIRES `tenant-id`. BE rejects with 400 if missing.

### Refresh token — single-flight

Port pattern from yudao `service.ts`. Module-level `isRefreshing` + `requestQueue`. First 401 triggers refresh; subsequent 401s queue + replay. Refresh request uses bare axios (no interceptor chain) to avoid recursion. `_isRetry` flag prevents infinite loop. Failure → `handleAuthorized()` (Modal.confirm via `antdApp` + dispatch logout via dynamic import).

### antd App API — never static `message`/`Modal`

Components use `App.useApp()`. Non-React modules use `antdApp` proxy from `@/shared/lib/antd-app-ref`. NEVER `import { message, Modal } from 'antd'` for actual usage (only types). See CONVENTIONS §Patterns from Task 2.

## Component Conventions

### Shared Components (in `shared/components/`)

- `<DictTag dictType="..." value={...}>` — colored badge from dict data
- `<DictSelect dictType="...">` — antd Select bound to a dict type
- `<DeptTreeSelect>` — dept tree picker
- `<PostSelect mode="single|multiple">` — post picker

### Permission gate (in `features/permission/`)

- `<HasPermission code="..." fallback={...}>` — permission-gated rendering
- `usePermission()` — programmatic check, returns `hasPermission(code)`

### CRUD Page Pattern

For building new CRUD admin pages, follow the skill at `skills/crud-page/`:

```
skills/crud-page/
├── README.md           # Entry point + agent prompt template
├── be-extraction.md    # BE controller → FE inputs mapping
├── decisions.md        # Decision tree for variants
├── steps.md            # 9-step build templates
└── _example/           # Concrete reference (sanitized system/user)
```

**Agent workflow**: read `README.md` → `be-extraction.md` → `decisions.md` → `steps.md`, with `_example/` as reference. The agent prompt template in README is copy-paste ready.

The orchestrating page component lives at `features/<module>/<entity>/pages/<entity>-list-page.tsx`. The thin wrapper at `src/pages/<module>/<entity>/index.tsx` (matches `system_menu.component`) is one-line re-export:

```tsx
import { UserListPage } from '@/features/system/user/pages/user-list-page'

export default function SystemUserPage() {
  return <UserListPage />
}
```

For Coding Conventions + Patterns reference, see `CONVENTIONS.md`.

## Coding Conventions

See `CONVENTIONS.md` for full details. Highlights:

- File naming: **kebab-case** for ALL files including components (`user-list-page.tsx`, `dict-select.tsx`, `app-shell.tsx`). NO PascalCase file names.
- Folder naming: **kebab-case**.
- Component export naming: **PascalCase** in code (`UserListPage`, `DictSelect`).
- Hook file naming: `use-xyz.ts` exports `useXyz`.
- Type suffix: **DTO** (matching BE), e.g., `UserRespDTO`, `UserSaveReqDTO`.
- Comments: **English only**. No Chinese / Vietnamese comments. JSDoc on exported components, hooks, non-trivial functions.
- No hardcoded colors. Use `theme.useToken()` or antd component props.
- Tailwind v4 for layout primitives only: spacing, sizing, flex/grid, positioning. NOT for colors.
- No hardcoded text strings. Use `t('namespace.key.path')` from i18next.
- i18n keys: per-domain namespace (`systemUser.form.username`, `common.cancel`). Top-level matches `<module><Entity>` camelCase.

## Don't

- ❌ Don't use Vite `server.proxy` or any dev-only workaround that masks BE config gaps. Fix BE CORS instead.
- ❌ Don't fall back to env vars when a BE endpoint should provide the value.
- ❌ Don't wrap callbacks in `useCallback` or values in `useMemo` by default. React Compiler handles this.
- ❌ Don't mutate state, props, or destructured values during render.
- ❌ Don't hardcode role checks. Use `<HasPermission>`.
- ❌ Don't use `useEffect` for data fetching. Use TanStack Query.
- ❌ Don't put API URLs as strings in components. Centralize in `features/{module}/{entity}/api/`.
- ❌ Don't use `any` type. Define proper interfaces (suffix `DTO`).
- ❌ Don't use Tailwind for colors. Use antd tokens.
- ❌ Don't put `className` on antd components for visual styling.
- ❌ Don't use `<Outlet>` inside main shell for menu content.
- ❌ Don't install RHF or zod baseline (per-feature add only).
- ❌ Don't create components > 400 lines without splitting.
- ❌ Don't import from other feature modules (exception: `features/permission`).
- ❌ Don't use `localStorage` for tabs state — sessionStorage via redux-persist.
- ❌ Don't sync table state to URL by default.
- ❌ Don't use PascalCase for file or folder names.
- ❌ Don't write Chinese / Vietnamese comments. English only.
- ❌ Don't use static `message` / `Modal` from `'antd'` for actual usage. Use `App.useApp()` or `antdApp` proxy.
- ❌ Don't use `Form.Item normalize` for dict-typed fields. Use boundary conversion (DictSelect tax).
- ❌ Don't put callbacks in mutation hooks. Caller chains `await mutateAsync()` + UI action.
- ❌ Don't let `skills/crud-page/_example/` drift silently. When `features/system/user/` refactors meaningfully, update example or re-anchor to a stable reference page.

## Communication & Decisions

When porting from `yudao-ui-admin-vue3` (Vue) to Soar (React) — or adapting any reference codebase (`acc-logistic-rmk-fe`, yudao-cloud, etc.) — agents follow these rules.

### Reference-following

- **Default: port 1:1.** Match yudao's pattern unless there is a concrete reason to deviate (Vue→React semantics gap, decision already chosen in `docs/plans/fe-admin-architecture-plan.md`, ADR, or maintenance status of a dep).
- **Deviations must be explicit.** State source pattern + proposed Soar adaptation + reason. Inline `// pattern from yudao service.ts:42 — adapted because <reason>` keeps trace readable.
- **Don't silently substitute libraries.** Raise the question.

### Asking vs deciding

- **When unsure whether the user wants 1:1 port or adaptation, ASK.** Format: state yudao pattern, list 2-3 alternatives (port / adapt / skip), short recommendation, end with question.
- **Edge cases that look minor are still questions.**
- **Don't invent context.** Read source or ask. No fabricating from memory.

### Examples vs decisions

- **Mark illustrative examples as `EXAMPLE` or `ILLUSTRATION`** when mixing proposed code with format demonstrations.
- **Never use real file paths in EXAMPLE blocks** unless the path is also the final decision.

### No workarounds for missing dependencies

- **If BE is missing an API, request it.** No client-side stub.
- **If a yudao pattern depends on a library Soar doesn't have, request the library decision.** Verify maintenance status (last release, maintainer activity, framework compatibility) per Soar library vetting rule before adopting from yudao — yudao uses China-ecosystem libraries that may be abandoned.
- **If a decision is missing from the architecture plan, ask the user.**

### ADR discipline

When a significant architectural decision occurs (new pattern, library swap, convention change with cross-cutting impact):

- The agent **drafts** the ADR using Nygard format in `docs/decisions/adr/<NNNN>-<kebab-title>.md`.
- Sections: Context / Decision / Alternatives considered / Consequences (Positive, Negative, Risks, Follow-ups) / References.
- Numbering append-only. To deprecate, write a new ADR with `Status: Supersedes <NNNN>` and update the old one to `Status: Superseded by <NEW>`.
- Long reviews + applies. Agent does not commit ADRs directly.

For task-level deliberations (a discrete block of work shipping multiple files), produce a deliverable doc in `docs/decisions/tasks/<phase>/<block-id>-<title>.md`. ADRs are for cross-cutting architecture; task deliverables are for "how we built this specific thing".

### Working style

- **Analyze first, clarify open points, get decisions, then produce output as markdown files.** Don't write code until explicitly asked.
- **Ship per-block, wait for confirmation between blocks.**
- **Don't generate find-replace patches** when a full new file is faster for both agent and human. Produce complete files for paste-replace.

## Verification Checklist

- [ ] `pnpm type-check` passes
- [ ] `pnpm build` succeeds
- [ ] No `any` types
- [ ] Action buttons wrapped in `<HasPermission>`
- [ ] API calls use `request` from `shared/api/http-client.ts`
- [ ] Server data fetched via TanStack Query (not useEffect)
- [ ] Forms use antd Form (not RHF)
- [ ] No hardcoded text — uses `t()` from i18next
- [ ] No hardcoded colors — uses antd tokens
- [ ] Tailwind used only for layout (no color/typography on theme-sensitive elements)
- [ ] Date/time via `formatDateTime()` from `shared/lib/format`
- [ ] Icons via `@iconify/react`
- [ ] No manual `useMemo` / `useCallback` unless profiler-justified
- [ ] No mutation of state/props during render
- [ ] `App.useApp()` for `message` / `modal` / `notification` (no static `'antd'` imports for usage)
- [ ] DictSelect tax applied at form boundary (no `Form.Item normalize` on dict-typed fields)
- [ ] Mutations don't accept callbacks — caller chains `await mutateAsync()`
- [ ] `dependencies={[...]}` on Form.Item validators that reference other fields
- [ ] Page wrapper in `src/pages/` matches `system_menu.component`
- [ ] All file names kebab-case
- [ ] No Chinese / Vietnamese comments
- [ ] For new CRUD pages: followed `skills/crud-page/` workflow
- [ ] Deviations from yudao explicitly noted

## Deep Context

### Plans + Phase summaries

- Master architecture: `docs/plans/fe-admin-architecture-plan.md`
- Phase 5A baseline: `docs/phases/phase-5a-summary.md`
- Phase 5A smoke test: `docs/phases/phase-5a-smoke-test.md`
- Backend phase plan: `../soar-be/docs/phase-plan.md`

### Decisions

- ADR index: `docs/decisions/README.md` → individual ADRs at `docs/decisions/adr/<NNNN>-*.md`
- Task deliverables (Phase 5B in progress): `docs/decisions/tasks/5b/<task-id>-*.md`
- Backend decisions: `../soar-be/docs/architecture-decisions.md`

### Skills (agent guidance)

- CRUD page skill: `skills/crud-page/` (README + be-extraction + decisions + steps + \_example/)

### Code conventions

- `CONVENTIONS.md` — detailed coding standards (this file's source of truth for naming, file org, patterns)

### Tech debt

- `TECH_DEBT.md` — current debt items + resolved log
