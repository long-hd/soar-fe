# Phase 5A — Summary & Handoff

**Status**: ✅ Complete (functional MVP).
**Duration**: ~3-4 weeks across Block A → D.
**Scope**: FE foundation — auth flow, routing, AppShell, page dispatcher. Real CRUD pages = Phase 5B.

This doc is the **single-source reference** for what was built and why. Read this before Phase 5B kickoff.

---

## 1. What was built

End-to-end working path:

```
Visit / → TenantBootGate resolves tenant via GET /tenant/get-by-website
        → AuthGuard checks isAuthed
        → LoginPage if logged out
        → User logs in → tokens stored (Redux + localStorage)
        → getPermissionInfo populates user + roles + permissions + menus
        → AppShell renders (header + sider + content)
        → Sider builds menu tree from Redux
        → Click menu → URL ?tab=<key>
        → TabRenderer dispatches via import.meta.glob
        → Page renders (or "Coming soon" fallback)
        → Logout → tokens cleared, tenant survives, back to LoginPage
```

Session resilience:

- F5 reload: redux-persist rehydrates state, bootstrapAuth refreshes permission info.
- Token expired mid-request: auth-interceptor single-flight refresh + retry.
- Refresh fails: Modal.confirm "Session expired" → user re-logs in.
- Deep link `/?tab=system-user` when logged out: AuthGuard preserves redirect param through login flow.

---

## 2. Stack

| Layer          | Library                                            | Version                                    |
| -------------- | -------------------------------------------------- | ------------------------------------------ |
| Build          | Vite + Rolldown                                    | 8                                          |
| UI framework   | React                                              | 19.2                                       |
| TypeScript     | TS strict                                          | 5.x                                        |
| Component lib  | antd                                               | v6                                         |
| Layout utility | Tailwind                                           | v4 (CSS-first, `@tailwindcss/vite` plugin) |
| State (client) | Redux Toolkit + redux-persist                      | 2.x + 6.x                                  |
| State (server) | TanStack Query                                     | v5                                         |
| Router         | react-router-dom                                   | v7                                         |
| HTTP           | axios + qs                                         | 1.x + 6.x                                  |
| i18n           | i18next + react-i18next + browser-languagedetector | 25.x                                       |
| Date           | dayjs                                              | 1.x                                        |
| Icons          | @iconify/react                                     | 6.x                                        |
| React Compiler | `@rolldown/plugin-babel` + babel preset            | latest                                     |

`pnpm` package manager. Node 22 LTS.

---

## 3. Architecture decisions

### 3.1 Flat URL pattern (the biggest decision)

All menu-triggered pages live at `/?tab=<tabKey>`. Only **4 top-level routes** total:

- `/login`, `/forbidden`, `/` (protected), `/*` (404).

The `/` route renders AppShell. Content area inside AppShell uses `<TabRenderer>` that reads `?tab=` from URL → finds menu by `tabKey` in Redux → resolves `menu.component` (e.g., `system/user/index`) via `import.meta.glob('/src/pages/**/*.tsx')` → renders via `React.lazy` + `Suspense`.

**Why**: react-router-dom v7 has no `router.addRoute()`. Yudao's pattern of "BE returns menus → FE generates routes dynamically" requires that capability. The cleanest react alternative is flat URL with client-side dispatch. Result: 200+ lines of yudao route generation transformer → 30 lines of TabRenderer.

**Trade-off**: detail pages share the same `/` URL with parent (e.g., `/?tab=system-user-detail&id=123`). Browser back button works. Menu highlight needs `parentTabKey` BE field for detail pages to highlight parent list menu — deferred to Phase 5B (tech debt #13).

### 3.2 Token storage — Redux + localStorage duplicated (Option A)

Tokens stored in **two places** by design:

1. `shared/lib/token.ts` localStorage (keys: `SOAR_ACCESS_TOKEN`, `SOAR_REFRESH_TOKEN`) — module-level access for `auth-interceptor` before React mounts.
2. `auth-slice.{accessToken, refreshToken}` in Redux, auto-persisted to `persist:soar:auth` — for React `useAppSelector(selectIsAuthed)` reactivity.

5 sync sites updated together (documented inline in `auth-slice.ts` JSDoc):

1. `login.fulfilled` reducer + thunk's `setTokensInStorage()`
2. `logout` thunk's `removeTokens()` + reducer reset
3. `setTokens` sync action + interceptor `setTokensInStorage` after refresh
4. `auth-interceptor` refresh success
5. `tenant-boot-gate` boot — no manual sync needed (redux-persist rehydrates)

Alternative options considered:

- **B (yudao 1:1)**: tokens only in localStorage, React selector via custom hook listening `storage` event. Rejected — hook complexity.
- **C (Redux blacklist tokens from persist + bootstrap dispatch)**: cleaner separation, 1 storage entry only. Deferred — small benefit, isolated future refactor.

### 3.3 Tenant resolution — hostname-based, no env fallback

`TenantBootGate` calls `GET /tenant/get-by-website?website=<location.host>` on app boot. BE matches against `system_tenant.websites` JSONB column. On null result (no match) → full-screen `TenantErrorPage` blocks app.

**No** `VITE_DEFAULT_TENANT_ID` env var. Multi-tenant deployments switch tenant by changing hostname (e.g., `tenant-a.example.com` vs `tenant-b.example.com`).

Tenant **survives logout** (matches yudao). Same user typically logs into same tenant.

### 3.4 antd v6 + Tailwind v4 hybrid

- **antd**: ALL components (Button, Form, Table, Input, Card, Result, Spin, Dropdown, Layout, Menu, Avatar, etc.).
- **Tailwind**: ONLY layout primitives (`flex`, `gap`, `h-screen`, `items-center`, `max-w-md`, etc.).
- **No Tailwind colors / typography utilities** — antd theme tokens own those (light/dark mode handled by antd ConfigProvider algorithm).

Where theme-aware property needed in custom component (e.g., login wordmark color), use `theme.useToken()` from antd: `const { token } = theme.useToken(); style={{ color: token.colorPrimary }}`.

### 3.5 HTTP layer — no wrap, caller `.data.data` explicit

axios instance named `request` (not `http`/`api` — leaves room for future wrappers). Response interceptors:

- `auth-interceptor` (registered first): handles `data.code === 401`, single-flight refresh + retry.
- `error-interceptor` (registered second): validates `data.code`, toasts `data.msg` for non-zero non-401.

**Neither unwraps** `CommonResult`. Caller code:

```ts
const res = await request.get<CommonResult<UserDTO>>(url)
return res.data.data // explicit unwrap
```

Why: matches yudao mindset (no magic), prevents type drift when caller wants raw `CommonResult` for inspection.

### 3.6 Single-flight refresh with `_isRetry` guard

`auth-interceptor` uses module-level `isRefreshing` + `requestQueue` (yudao pattern). Plus a `_isRetry` flag on config to prevent infinite loop if BE keeps returning 401 after refresh — yudao **doesn't have this guard** and would loop forever in that scenario. Soar fails fast.

Refresh runs via dedicated `refreshClient = axios.create()` (no interceptors), avoiding recursion. Refresh success → calls `setTokens()` to storage + dispatches via dynamic import to Redux. Refresh fail → `handleAuthorized()` shows Modal.confirm → click "Log in" → `await import + dispatch(logout())`.

### 3.7 Query string format — `arrayFormat: 'repeat'`

`qs.stringify(params, { allowDots: true, arrayFormat: 'repeat' })` — yudao uses default `'indices'` which produces `ids[0]=1&ids[1]=2`. Spring Boot `@RequestParam List<>` expects `ids=1&ids=2` (repeat). 1-word divergence from yudao, justified for BE compat.

### 3.8 Persistence split

- `localStorage` (cross-tab session, survives reload): `auth-slice`, `theme-slice`.
- `sessionStorage` (per-browser-tab, F5 keeps, new tab fresh): `tags-view-slice` (Phase 5B will use).

Inline `createWebStorage()` adapter in `store.ts` — bypasses `redux-persist/lib/storage` CJS/ESM Vite interop bug.

### 3.9 Login redirect honored

After login, navigate to `?redirect=<encoded>` if present, else `/`. AuthGuard encodes `location.pathname + location.search` via `encodeURIComponent` so inner `?tab=` query doesn't get parsed as outer.

---

## 4. Divergences from yudao

What Soar does differently:

| Area                | Yudao                                              | Soar                                                                     |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Routing             | Dynamic route registration via `router.addRoute()` | 4 static routes + flat URL `?tab=` + `import.meta.glob`                  |
| Route generation    | `generateRoutes()` transformer (200+ lines)        | None                                                                     |
| Router guard        | Global `router.beforeEach` callback                | Component wrapper `<AuthGuard>`                                          |
| Cache layer         | `web-storage-cache` (`wsCache`) wrapper            | Plain `localStorage` + redux-persist                                     |
| Refresh recursion   | Mutates `axios.defaults.headers` globally          | Dedicated `refreshClient = axios.create()`                               |
| Refresh loop guard  | None (would loop infinitely)                       | `_isRetry` flag — fails fast after 1 retry                               |
| Permissions         | `Set<string>` for O(1) lookup                      | `string[]` (redux-persist needs JSON-serializable), `.includes()` lookup |
| Query string arrays | Default `indices`: `ids[0]=1`                      | `repeat`: `ids=1&ids=2` (Spring Boot compat)                             |
| Auth state          | Pinia store + wsCache separate token storage       | Single auth-slice with token fields + mirrored to token.ts localStorage  |
| Menu storage        | wsCache `ROLE_ROUTERS` key                         | Redux `auth-slice.menus`, persisted                                      |
| API client pattern  | Named exports: `export const login = ...`          | Object grouping: `authApi.login(...)`                                    |
| HTTP wrapper        | `http.get()` helpers unwrap CommonResult           | `request.get()` raw, caller `.data.data`                                 |
| Menu labels         | Often i18n keys in `name` field                    | Raw BE strings (defer i18n — tech debt #14)                              |
| Active menu         | From route path or `meta.activeMenu` override      | From URL searchParam `?tab=`                                             |
| Sider collapse      | `app.getCollapse` in app store                     | `theme.siderCollapsed` (semantic stretch — tech debt #12)                |
| Captcha             | Slider widget + `captchaVerification` in login req | Optional field in DTO, no UI (BE has captcha disabled)                   |
| Tenant resolve      | Cookie + multi-source fallback                     | Hostname-only via `get-by-website` endpoint                              |
| Tenant header       | Always sent                                        | Sent when in storage; `visit-tenant-id` only when authed                 |

---

## 5. File tree (Phase 5A)

```
src/
├── app/                              # composition root
│   ├── providers.tsx                 # ReduxProvider → PersistGate → QueryClient → I18n → AntdConfig → TenantBootGate
│   ├── query-client.ts               # TanStack Query defaults
│   ├── store.ts                      # configureStore + inline createWebStorage + typed hooks
│   └── slices/
│       ├── auth-slice.ts             # state + 3 thunks (login, logout, bootstrapAuth) + selectors
│       ├── tags-view-slice.ts        # SKELETON — Phase 5B
│       └── theme-slice.ts            # mode + siderCollapsed
├── features/
│   └── auth/
│       ├── api/auth-api.ts           # 5 functions (login, logout, getPermissionInfo, getTenantByWebsite, getTenantIdByName)
│       ├── components/tenant-boot-gate.tsx   # boot resolve + bootstrapAuth dispatch
│       └── types.ts                  # 5 DTOs match BE
├── layouts/
│   ├── app-shell.tsx                 # antd Layout 3-pane
│   ├── blank-layout.tsx              # centered card for login/error
│   └── components/
│       ├── header-bar.tsx            # sider toggle + user dropdown
│       ├── sider-menu.tsx            # recursive antd Menu from Redux
│       └── tab-renderer.tsx          # flat URL dispatcher via import.meta.glob
├── pages/
│   ├── error/{forbidden,not-found,tenant-error}.tsx
│   ├── login/login-page.tsx
│   └── system/user/index.tsx         # Phase 5A only real page; rest "Coming soon" via fallback
├── routes/
│   ├── router.tsx                    # createBrowserRouter 4 routes
│   └── guards/auth-guard.tsx
├── shared/
│   ├── api/
│   │   ├── http-client.ts            # `request` axios instance + qs paramsSerializer
│   │   ├── types.ts                  # CommonResult, PageResult, PageParam, AuthTokensDTO
│   │   └── interceptors/
│   │       ├── auth-interceptor.ts   # single-flight refresh
│   │       └── error-interceptor.ts  # code validation + toast
│   ├── i18n/
│   │   ├── index.ts                  # i18next init
│   │   └── locales/{en,vi}.json      # ~35 keys
│   └── lib/
│       ├── env.ts                    # typed import.meta.env wrapper
│       ├── format.ts                 # dayjs date formatters
│       ├── permission-matcher.ts     # pure hasPermission(perms, required)
│       ├── tenant.ts                 # 6 functions (tenantId + visitTenantId I/O)
│       └── token.ts                  # getAccessToken, setTokens, removeTokens, formatToken
├── index.css                         # Tailwind v4 entry + minimal resets
├── main.tsx                          # createRoot + AppProviders + RouterProvider
└── vite-env.d.ts
```

---

## 6. Tech debt — remaining 10 items

All defer-able, none block Phase 5A DoD.

| #   | Where                      | What                                                     | Defer to          | Note                       |
| --- | -------------------------- | -------------------------------------------------------- | ----------------- | -------------------------- |
| 5   | `tags-view-slice.ts`       | Skeleton only — no tab-bar UI yet                        | **Phase 5B**      | Core feature next phase    |
| 6   | i18n                       | No typed `t()` via module augmentation                   | Phase 5B+         | When keys >100             |
| 9   | `tenant-boot-gate`         | Stale tenantId not re-validated on each boot             | Phase 5B+         | Defensive only             |
| 11  | antd `message`/`Modal`     | Static API deprecated in v6 (use `App.useApp()` context) | Phase 5B+         | Wrap with `<App>` provider |
| 12  | `theme-slice`              | Now owns mode + siderCollapsed (semantic stretch)        | When >5 fields    | Rename `ui-slice`          |
| 13  | `MenuDTO`                  | No `parentTabKey` for detail-page menu highlight         | **Phase 5B**      | Add BE field + FE consume  |
| 14  | `sider-menu`               | Menu labels raw BE strings, not i18n                     | Phase 5B+         | Add `i18nKey` field        |
| 16  | Iconify                    | Online fetch only, no offline bundle                     | Production polish | Add `@iconify/icons-*`     |
| 17  | `tab-renderer`             | No ErrorBoundary around lazy load                        | Phase 5B+         | `react-error-boundary`     |
| 19  | `pages/<entity>/index.tsx` | Most files don't exist; "Coming soon" fallback           | **Phase 5B**      | Created as CRUD lands      |

Items 5, 13, 19 are direct Phase 5B work.

---

## 7. Backend source of truth

When the FE shape needs cross-checking, refer to these BE files (canonical):

| FE concern                                          | BE source                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `AuthLoginReqDTO`, `AuthLoginRespDTO`               | `soar-module-system/.../auth/dto/{AuthLoginReqDTO.java, AuthLoginRespDTO.java}`      |
| `AuthPermissionInfoRespDTO` + `UserDTO` + `MenuDTO` | `soar-module-system/.../auth/dto/AuthPermissionInfoRespDTO.java`                     |
| `TenantSimpleRespDTO`                               | `soar-module-system/.../tenant/dto/TenantSimpleRespDTO.java`                         |
| Public tenant endpoints                             | `soar-module-system/.../tenant/TenantController.java` (`@PermitAll + @TenantIgnore`) |
| `tab_key` schema                                    | `soar-server/.../db/migration/V1_0_8__add_menu_tab_key.sql`                          |
| Menu seed (tab_key + component values)              | `soar-server/.../db/migration/V1_0_9__reseed_system_menu.sql`                        |
| Tenant `websites` seed                              | `soar-server/.../db/migration/V1_0_5__seed_tenant_default.sql` (or similar)          |
| HTTP error encoding (`code` in body)                | `soar-framework/.../security/handler/AuthenticationEntryPointImpl.java`              |
| Default error envelope                              | `soar-framework/.../core/CommonResult.java`, `PageResult.java`                       |
| `@PermitAll` + `@TenantIgnore` semantics            | `soar-framework/.../security` + `soar-framework/.../tenant` annotations              |

For BE changes that affect FE shape (e.g., new field in MenuDTO), update FE `features/auth/types.ts` accordingly + add to tech debt if migration not immediate.

---

## 8. Conventions chốt cho Phase 5B

Quick rules carried forward — see `AGENTS.md` + `CONVENTIONS.md` for canonical (note: those docs need spot updates batched separately, see `AGENTS.md` pending fixes list maintained in session memory).

- **Files**: kebab-case all `.ts`/`.tsx`. Component name PascalCase exports.
- **Imports**: `pages → features → shared`. `features/A ↛ features/B` (move to shared). `shared/ ↛ features/`.
- **API client**: `request.get<CommonResult<T>>(url, ...)` then `res.data.data`. Group as `<entity>Api = { method: async () => {...} }` object.
- **Forms**: antd `Form` baseline. No zod/RHF for Phase 5B core unless complexity demands.
- **Tables**: antd `Table` direct + `useUrlTableState` hook (Phase 5B will define) for URL-sync of page/filter state.
- **Mutations**: TanStack Query `useMutation`, invalidate keys after.
- **i18n**: every user-visible string via `t()`. Locale files under `shared/i18n/locales/`.
- **Permissions**: gate buttons via `usePermission()` hook (Phase 5B will define). Use BE permission codes (`system:user:create` etc.).
- **No Chinese comments** in any code or doc.
- **No dev-only workarounds** in source — request BE fix instead. CORS is configured BE-side via `SoarWebAutoConfiguration`.

---

## 9. Phase 5B kickoff

Suggested first 3-4 tasks to start Phase 5B:

1. **tagsView UI** (resolves #5):
   - Implement `TabBar` component above `<Content>` in AppShell.
   - Multi-tab navigation: click sider menu → add tab + activate. Close button per tab. `closeOthers` / `closeAll` context menu.
   - Port yudao tagsView reducers to `tags-view-slice.ts` full impl.
   - Decision needed: animate vs jump-cut on tab switch.

2. **First real CRUD page** — `system/user`:
   - Replace `pages/system/user/index.tsx` placeholder with full CRUD.
   - Use a `crud-page` skill template (`skills/crud-page.md` — to be created in Phase 5B): search form + filtered table + page/filter state in URL + create/edit modal + delete confirm + permission-gated buttons.
   - This page acts as the **reference implementation** for all subsequent CRUD pages (role, menu, dept, dict, etc.).
   - Extract thin `<CrudTable>` wrapper around antd Table after first use lands — codify recurring boilerplate without overgeneralizing.

3. **`parentTabKey` field** (resolves #13):
   - BE migration adds `system_menu.parent_tab_key VARCHAR(100)`.
   - BE `MenuDTO` emits the field.
   - FE `sider-menu.tsx` uses `parentTabKey` to determine active menu when current `?tab=` doesn't match any leaf menu directly (e.g., detail page).
   - Required before first detail page lands.

4. **Permission-gated buttons + menu filter** (D1/D2 deferred):
   - Implement `usePermission()` hook reading `selectPermissions`.
   - Implement `<HasPermission code="...">` wrapper component.
   - Apply throughout first CRUD page.
   - Filter `sider-menu` items by permission too — non-admin users see only menus they can access.

After these 4 tasks, Phase 5B core is established. Subsequent CRUD pages follow the template.

---

## 10. Lessons learned (worth remembering)

- **Vite + redux-persist CJS interop**: inline `createWebStorage(window.localStorage)` instead of `redux-persist/lib/storage` import. Saves ~20min debug for next person.
- **React 19 strict-mode double-invoke**: useEffect runs twice in dev. Use `useRef` guards for one-shot API calls (see `tenant-boot-gate.tsx`).
- **Circular import in interceptors**: `auth-interceptor` ↔ `http-client` via top-level ESM works because function bodies execute after init. `auth-interceptor` ↔ `store` ↔ `auth-slice` uses dynamic `await import()` inside Modal `onOk` because that's a 4-way chain.
- **antd v6 static API deprecation**: `message.error()` and `Modal.confirm()` still work but lack ConfigProvider context. Migrate to `App.useApp()` when convenient (tech debt #11).
- **react-router v7 NO `addRoute`**: forces architectural decision (flat URL vs nested static). Soar chose flat. Different from yudao but cleaner for this stack.
- **antd Menu items prop**: pass nested children directly, antd handles recursion. Parent groups without click target get synthetic key + click handler ignores them.
- **import.meta.glob lazy mapping**: build map at module init (Long's refactor of tab-renderer), index by key in render. No render-time `lazy()` calls.

---

**Phase 5A is done. Next: Phase 5B.**

Reference this doc when starting Phase 5B work. Update tech debt list as items are resolved.
