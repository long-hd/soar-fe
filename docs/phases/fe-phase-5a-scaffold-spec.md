# Soar FE — Phase 5A Scaffold Spec

> Step-by-step actions to bootstrap the Soar admin frontend.
> Companion to `FE_Admin_Architecture_Plan.md` and `BE_Spec_V1_0_8_Changes.md`.

**Version**: 1.0
**Status**: Spec — ready to implement
**Estimated effort**: 3–5 days for a solo dev (parallelizable with BE V1_0_8 work)
**Goal**: Boot a working dev shell — login → app shell with one rendered page from the BE menu. No tab bar yet (Phase 5B), no Activity (Phase 5C).

---

## 0. Prerequisites

- Node.js 20.x or 22.x LTS installed.
- `pnpm` installed globally.
- `soar-be` running locally on `http://localhost:8080` with V1_0_8 migration applied (tab_key populated for at least one menu, e.g., `system-user`).
- A test user (preferably super admin) credential.

---

## 1. Project bootstrap

### 1.1 Initialize Vite + React + TS

```bash
cd /path/to/workspace
pnpm create vite soar-fe --template react-ts
cd soar-fe
pnpm install
```

### 1.2 Verify React 19.2+

```bash
pnpm list react
# Expect: react@19.2.x or higher
```

If lower, upgrade:

```bash
pnpm add react@^19.2 react-dom@^19.2
pnpm add -D @types/react@^19 @types/react-dom@^19
```

### 1.3 Install dependencies

```bash
pnpm add \
  antd \
  @reduxjs/toolkit \
  react-redux \
  redux-persist \
  @tanstack/react-query \
  @tanstack/react-query-devtools \
  react-router-dom \
  axios \
  i18next \
  react-i18next \
  i18next-browser-languagedetector \
  dayjs \
  @iconify/react

pnpm add -D \
  tailwindcss \
  @tailwindcss/vite \
  @babel/core \
  @rolldown/plugin-babel \
  babel-plugin-react-compiler \
  @types/babel__core \
  @types/node \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom
```

**React Compiler dependencies**: `@babel/core` + `@rolldown/plugin-babel` + `babel-plugin-react-compiler` enable the compiler in Vite 8's Rolldown pipeline. See §1.4 for plugin wiring.

Pin specific versions if reproducibility matters. Check antd is v6:

```bash
pnpm list antd
# Expect: antd@6.x.x
```

### 1.4 Vite config (`vite.config.ts`)

```ts
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }), // React Compiler
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**No dev proxy needed**: Soar BE (`SoarWebAutoConfiguration.corsFilterBean`) has CORS allow-origin-pattern `*` + allow-headers `*` + allow-credentials. FE calls BE via absolute URL from `VITE_API_BASE_URL` — no CORS issue.

**React Compiler note**: enabled at build time via `babel-plugin-react-compiler` + `reactCompilerPreset`. Auto-memoizes components — avoid manual `useMemo`/`useCallback` (see Plan §8.8, CONVENTIONS §React Compiler).

### 1.5 TS config additions (`tsconfig.json`)

Add (or verify) under `compilerOptions`:

```json
{
  "strict": true,
  "paths": {
    "@/*": ["./src/*"]
  },
  "types": ["vite/client"]
}
```

### 1.6 Env file (`.env.development`)

```
VITE_API_BASE_URL=http://localhost:8080
VITE_DEFAULT_TENANT_ID=1
```

`VITE_API_BASE_URL` set to BE absolute URL (Soar BE has CORS allow-all in dev — no proxy needed). For production, replace with deployment URL or leave blank if FE and BE are same-origin behind a reverse proxy.

`.env.example` (commit, no secrets):

```
VITE_API_BASE_URL=
VITE_DEFAULT_TENANT_ID=1
```

### 1.7 Vitest baseline config

Minimal setup — just enough for `pnpm test` to boot. No tests written in Phase 5A; this is config-only so later additions don't require setup work.

`vitest.config.ts` (root):

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true, // describe/it/expect available without import
    environment: 'jsdom', // DOM for React Testing Library
    setupFiles: ['./src/test/setup.ts'],
    css: false, // skip CSS processing in tests (faster)
  },
})
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Auto cleanup after each test
afterEach(() => {
  cleanup()
})
```

Update `tsconfig.app.json` to include Vitest globals + jest-dom matchers:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  }
}
```

Create the test directory:

```bash
mkdir -p src/test
touch src/test/setup.ts
# paste the setup.ts content above
```

Verify: `pnpm test:run` should exit cleanly with "No test files found" (this is expected — no tests yet). `pnpm test` opens watch mode and waits.

**Deferred to when first test is written**:

- MSW for API mocking (`pnpm add -D msw`)
- Coverage provider (`pnpm add -D @vitest/coverage-v8`) + `test:coverage` script

---

## 2. Folder skeleton

Run the touch commands from `FE_Admin_Architecture_Plan.md` Appendix B:

```bash
mkdir -p src/{app/slices,shared/{api/interceptors,components,hooks,lib,i18n/locales},features/auth,pages,layouts/components,routes/guards}

touch src/app/{store,query-client,providers}.tsx
touch src/app/slices/{auth,menu,tabs,theme}.slice.ts
touch src/shared/api/{http-client,types}.ts
touch src/shared/api/interceptors/{tenant,auth,error}-interceptor.ts
touch src/shared/lib/{env,tenant,token,format,permission-matcher}.ts
touch src/shared/hooks/{useDict,usePagedQuery,usePermission,useDocumentTitle}.ts
touch src/shared/components/{HasPermission,DictTag,DictSelect,MenuIcon}.tsx
touch src/shared/i18n/config.ts
touch src/shared/i18n/locales/{en,vi,zh-CN}.json
touch src/layouts/{AppShell,BlankLayout}.tsx
touch src/layouts/components/{SiderMenu,HeaderBar,TabRenderer}.tsx
touch src/routes/index.tsx
touch src/routes/guards/AuthGuard.tsx
touch src/pages/{forbidden,not-found}.tsx
touch src/pages/login.tsx
```

---

## 3. Foundation modules — implementation order

Build in this order to avoid forward references. Each step is testable independently.

### Step 1: `shared/lib/env.ts`

```ts
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '') as string,
  defaultTenantId: (import.meta.env.VITE_DEFAULT_TENANT_ID ?? '1') as string,
}
```

### Step 2: `shared/lib/tenant.ts`

```ts
import { env } from './env'

const STORAGE_KEY = 'soar_tenant_id'

export function getTenantId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? env.defaultTenantId
}

export function setTenantId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

export function clearTenantId(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

### Step 3: `shared/lib/token.ts`

```ts
const ACCESS_KEY = 'soar_access_token'
const REFRESH_KEY = 'soar_refresh_token'
const EXPIRES_KEY = 'soar_expires_time'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresTime: string
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setToken(token: TokenPair): void {
  localStorage.setItem(ACCESS_KEY, token.accessToken)
  localStorage.setItem(REFRESH_KEY, token.refreshToken)
  localStorage.setItem(EXPIRES_KEY, token.expiresTime)
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EXPIRES_KEY)
}
```

### Step 4: `shared/lib/format.ts`

```ts
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss [GMT]Z'
const DATE_FORMAT = 'YYYY-MM-DD'

export function formatDateTime(instant: string | undefined | null): string {
  if (!instant) return ''
  return dayjs(instant).format(DATETIME_FORMAT)
}

export function formatDate(instant: string | undefined | null): string {
  if (!instant) return ''
  return dayjs(instant).format(DATE_FORMAT)
}
```

### Step 5: `shared/lib/permission-matcher.ts`

```ts
export function hasPermission(required: string, userPermissions: string[]): boolean {
  if (userPermissions.includes('*:*:*')) return true
  return userPermissions.includes(required)
}
```

### Step 6: `shared/api/types.ts`

```ts
export interface CommonResult<T> {
  code: number
  data: T
  msg: string
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export interface PageParam {
  pageNo: number
  pageSize: number
}
```

### Step 7: `shared/api/http-client.ts` + interceptors

```ts
// shared/api/http-client.ts
import axios, { type AxiosInstance } from 'axios'
import { env } from '@/shared/lib/env'
import { attachTenantHeader } from './interceptors/tenant-interceptor'
import { attachAuthHeader } from './interceptors/auth-interceptor'
import { unwrapResponse, handle401 } from './interceptors/error-interceptor'

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use(attachTenantHeader, e => Promise.reject(e))
http.interceptors.request.use(attachAuthHeader, e => Promise.reject(e))
http.interceptors.response.use(unwrapResponse, handle401)
```

```ts
// shared/api/interceptors/tenant-interceptor.ts
import type { InternalAxiosRequestConfig } from 'axios'
import { getTenantId } from '@/shared/lib/tenant'

export function attachTenantHeader(config: InternalAxiosRequestConfig) {
  config.headers.set('tenant-id', getTenantId())
  return config
}
```

```ts
// shared/api/interceptors/auth-interceptor.ts
import type { InternalAxiosRequestConfig } from 'axios'
import { getAccessToken } from '@/shared/lib/token'

export function attachAuthHeader(config: InternalAxiosRequestConfig) {
  const token = getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
}
```

```ts
// shared/api/interceptors/error-interceptor.ts
import type { AxiosError, AxiosResponse } from 'axios'
import { message } from 'antd'
import type { CommonResult } from '../types'
import { getRefreshToken, setToken, clearToken } from '@/shared/lib/token'
import { http } from '../http-client'

// Module-level state for single-flight refresh
let isRefreshing = false
let requestQueue: Array<() => void> = []

export function unwrapResponse<T>(response: AxiosResponse<CommonResult<T>>): T {
  const body = response.data
  if (body.code === 0) {
    return body.data
  }
  // Non-zero, non-401: show error and reject
  message.error(body.msg || 'Request failed')
  throw new Error(body.msg)
}

export async function handle401(error: AxiosError) {
  // Network error or non-axios error
  if (!error.response) {
    message.error(error.message || 'Network error')
    throw error
  }

  const status = error.response.status
  const config = error.config!

  // CommonResult-shaped 200 with code=401 vs HTTP 401 — handle both
  // Convention: BE returns 401 status for token expired
  if (status !== 401) {
    throw error
  }

  if (!isRefreshing) {
    isRefreshing = true
    try {
      const refresh = getRefreshToken()
      if (!refresh) {
        logout()
        throw error
      }
      // Call refresh endpoint
      const resp = await http.post(`/admin-api/system/auth/refresh-token`, null, {
        params: { refreshToken: refresh },
      })
      setToken(resp as any) // unwrapped by interceptor
      // Replay queued requests
      requestQueue.forEach(cb => cb())
      // Retry the current request
      config.headers!.Authorization = `Bearer ${(resp as any).accessToken}`
      return http(config)
    } catch (refreshErr) {
      requestQueue.forEach(cb => cb()) // unblock waiters; they will fail
      logout()
      throw refreshErr
    } finally {
      requestQueue = []
      isRefreshing = false
    }
  } else {
    // Queue this request
    return new Promise(resolve => {
      requestQueue.push(() => {
        const token = localStorage.getItem('soar_access_token')
        if (token) config.headers!.Authorization = `Bearer ${token}`
        resolve(http(config))
      })
    })
  }
}

function logout() {
  clearToken()
  window.location.href = '/login'
}
```

### Step 8: Redux slices

```ts
// app/slices/auth.slice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthUser {
  id: number
  username: string
  nickname: string
  avatar?: string
  deptId?: number
  email?: string
}

export interface AuthState {
  user: AuthUser | null
  roles: string[]
  permissions: string[]
  isLoggedIn: boolean
}

const initialState: AuthState = {
  user: null,
  roles: [],
  permissions: [],
  isLoggedIn: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPermissionInfo(
      state,
      action: PayloadAction<{ user: AuthUser; roles: string[]; permissions: string[] }>,
    ) {
      state.user = action.payload.user
      state.roles = action.payload.roles
      state.permissions = action.payload.permissions
      state.isLoggedIn = true
    },
    logout(state) {
      state.user = null
      state.roles = []
      state.permissions = []
      state.isLoggedIn = false
    },
  },
})

export const { setPermissionInfo, logout } = authSlice.actions
```

```ts
// app/slices/menu.slice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface MenuDTO {
  id: number
  parentId: number
  name: string
  type: 1 | 2 | 3
  sort: number
  permission: string | null
  tabKey: string | null
  component: string | null
  icon: string | null
  visible: boolean
  keepAlive: boolean
  alwaysShow: boolean
  children?: MenuDTO[]
}

export interface MenuState {
  tree: MenuDTO[]
  flatList: MenuDTO[] // flattened for quick tabKey lookup
}

const initialState: MenuState = { tree: [], flatList: [] }

function flatten(tree: MenuDTO[]): MenuDTO[] {
  const out: MenuDTO[] = []
  function walk(nodes: MenuDTO[]) {
    nodes.forEach(n => {
      out.push(n)
      if (n.children?.length) walk(n.children)
    })
  }
  walk(tree)
  return out
}

export const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setMenus(state, action: PayloadAction<MenuDTO[]>) {
      state.tree = action.payload
      state.flatList = flatten(action.payload)
    },
    clearMenus(state) {
      state.tree = []
      state.flatList = []
    },
  },
})

export const { setMenus, clearMenus } = menuSlice.actions
```

```ts
// app/slices/tabs.slice.ts
// Placeholder for Phase 5A. Will be expanded in Phase 5B.
import { createSlice } from '@reduxjs/toolkit'

export interface TabsState {
  // Phase 5A: keep minimal — just track which menu is the "current page"
  currentTabKey: string | null
}

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState: { currentTabKey: null } as TabsState,
  reducers: {
    setCurrent(state, action) {
      state.currentTabKey = action.payload
    },
  },
})

export const { setCurrent } = tabsSlice.actions
```

```ts
// app/slices/theme.slice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface ThemeState {
  mode: 'light' | 'dark'
}

export const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: 'light' } as ThemeState,
  reducers: {
    setMode(state, action: PayloadAction<'light' | 'dark'>) {
      state.mode = action.payload
    },
  },
})

export const { setMode } = themeSlice.actions
```

### Step 9: `app/store.ts`

```ts
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistReducer, persistStore } from 'redux-persist'
import storageSession from 'redux-persist/lib/storage/session'
import storageLocal from 'redux-persist/lib/storage'
import { authSlice } from './slices/auth.slice'
import { menuSlice } from './slices/menu.slice'
import { tabsSlice } from './slices/tabs.slice'
import { themeSlice } from './slices/theme.slice'

// Auth and menu are derived from BE (re-fetch on login). Tabs are per-tab session.
// Theme persists across sessions.
const tabsPersistConfig = { key: 'soar_tabs', storage: storageSession }
const themePersistConfig = { key: 'soar_theme', storage: storageLocal }

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  menu: menuSlice.reducer,
  tabs: persistReducer(tabsPersistConfig, tabsSlice.reducer),
  theme: persistReducer(themePersistConfig, themeSlice.reducer),
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefault =>
    getDefault({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

Add a tiny hooks file `app/hooks.ts`:

```ts
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './store'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

### Step 10: `app/query-client.ts`

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 0,
    },
  },
})
```

### Step 11: i18n config

```ts
// shared/i18n/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import vi from './locales/vi.json'
import zhCN from './locales/zh-CN.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      'zh-CN': { translation: zhCN },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'soar_locale',
      caches: ['localStorage'],
    },
  })

export default i18n
```

Seed locale files:

```json
// shared/i18n/locales/en.json
{
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.create": "Create",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.search": "Search",
  "common.reset": "Reset",
  "common.action": "Actions",
  "common.createTime": "Created At",
  "common.created": "Created",
  "common.updated": "Updated",
  "common.deleted": "Deleted",
  "common.confirmDelete": "Are you sure?",
  "auth.login.title": "Sign in to Soar",
  "auth.login.username": "Username",
  "auth.login.password": "Password",
  "auth.login.submit": "Sign In",
  "forbidden.title": "Access Denied",
  "notFound.title": "Page Not Found"
}
```

`vi.json` and `zh-CN.json` can be empty `{}` for now (fall back to `en`).

### Step 12: `app/providers.tsx`

```tsx
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ConfigProvider, theme as antdTheme } from 'antd'
import enUS from 'antd/locale/en_US'
import { store, persistor } from './store'
import { queryClient } from './query-client'
import { useAppSelector } from './hooks'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/shared/i18n/config'

function ThemedConfigProvider({ children }: { children: ReactNode }) {
  const mode = useAppSelector(s => s.theme.mode)
  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ThemedConfigProvider>
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </ThemedConfigProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}
```

### Step 13: Auth feature (`features/auth/`)

```
features/auth/
├── api/index.ts
└── components/login-page.tsx
```

```ts
// features/auth/api/index.ts
import { http } from '@/shared/api/http-client'
import type { MenuDTO } from '@/app/slices/menu.slice'
import type { AuthUser } from '@/app/slices/auth.slice'

export interface LoginReqDTO {
  username: string
  password: string
}

export interface LoginRespDTO {
  userId: number
  accessToken: string
  refreshToken: string
  expiresTime: string
}

export interface PermissionInfoRespDTO {
  user: AuthUser
  roles: string[]
  permissions: string[]
  menus: MenuDTO[]
}

export const authApi = {
  login: (data: LoginReqDTO) => http.post<LoginRespDTO>('/admin-api/system/auth/login', data),

  logout: () => http.post<void>('/admin-api/system/auth/logout'),

  refreshToken: (refreshToken: string) =>
    http.post<LoginRespDTO>('/admin-api/system/auth/refresh-token', null, {
      params: { refreshToken },
    }),

  getPermissionInfo: () =>
    http.get<PermissionInfoRespDTO>('/admin-api/system/auth/get-permission-info'),
}
```

```tsx
// features/auth/components/login-page.tsx
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api'
import { setToken } from '@/shared/lib/token'
import { useAppDispatch } from '@/app/hooks'
import { setPermissionInfo } from '@/app/slices/auth.slice'
import { setMenus } from '@/app/slices/menu.slice'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const mutation = useMutation({
    mutationFn: async (values: { username: string; password: string }) => {
      const loginResp = await authApi.login(values)
      setToken(loginResp)
      const info = await authApi.getPermissionInfo()
      dispatch(
        setPermissionInfo({ user: info.user, roles: info.roles, permissions: info.permissions }),
      )
      dispatch(setMenus(info.menus))
      return info
    },
    onSuccess: () => {
      message.success('Welcome')
      navigate('/', { replace: true })
    },
    onError: (err: any) => {
      message.error(err.message || 'Login failed')
    },
  })

  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <Card style={{ width: 400 }}>
        <Typography.Title level={3}>{t('auth.login.title')}</Typography.Title>
        <Form onFinish={mutation.mutate} layout="vertical">
          <Form.Item name="username" label={t('auth.login.username')} rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="password" label={t('auth.login.password')} rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block>
            {t('auth.login.submit')}
          </Button>
        </Form>
      </Card>
    </div>
  )
}
```

```tsx
// src/pages/login.tsx
export { default } from '@/features/auth/components/login-page'
```

### Step 14: Auth guard + routing

```tsx
// routes/guards/AuthGuard.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { authApi } from '@/features/auth/api'
import { setPermissionInfo } from '@/app/slices/auth.slice'
import { setMenus } from '@/app/slices/menu.slice'
import { getAccessToken } from '@/shared/lib/token'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const isLoggedIn = useAppSelector(s => s.auth.isLoggedIn)
  const location = useLocation()
  const token = getAccessToken()

  // If we have a token but no in-memory auth state, rehydrate (e.g., after F5)
  useEffect(() => {
    if (token && !isLoggedIn) {
      authApi
        .getPermissionInfo()
        .then(info => {
          dispatch(
            setPermissionInfo({
              user: info.user,
              roles: info.roles,
              permissions: info.permissions,
            }),
          )
          dispatch(setMenus(info.menus))
        })
        .catch(() => {
          // Token invalid — let the 401 interceptor handle redirect
        })
    }
  }, [token, isLoggedIn, dispatch])

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
```

```tsx
// routes/index.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './guards/AuthGuard'
import LoginPage from '@/pages/login'
import ForbiddenPage from '@/pages/forbidden'
import NotFoundPage from '@/pages/not-found'
import { AppShell } from '@/layouts/AppShell'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

### Step 15: AppShell (Phase 5A minimal — no TabBar yet)

```tsx
// layouts/AppShell.tsx
import { useEffect, useMemo, lazy, Suspense } from 'react'
import { Layout, Menu, Spin } from 'antd'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { setCurrent } from '@/app/slices/tabs.slice'
import type { MenuDTO } from '@/app/slices/menu.slice'
import { MenuIcon } from '@/shared/components/MenuIcon'

// Glob all pages for dynamic component resolution
const pageModules = import.meta.glob('/src/pages/**/*.tsx')

const TabParamsContext = React.createContext<Record<string, string>>({})
export function useTabParams() {
  return React.useContext(TabParamsContext)
}

export function AppShell() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const menus = useAppSelector(s => s.menu.flatList)

  const tabKey = searchParams.get('tab')

  // Pick the menu to render, fall back to first available
  const activeMenu = useMemo(() => {
    if (tabKey) {
      const m = menus.find(m => m.tabKey === tabKey)
      return m ?? null
    }
    // No tab in URL: default to first type=2 visible menu
    return menus.find(m => m.type === 2 && m.visible) ?? null
  }, [tabKey, menus])

  useEffect(() => {
    if (tabKey && menus.length > 0 && !activeMenu) {
      navigate('/forbidden', { replace: true })
    }
    dispatch(setCurrent(activeMenu?.tabKey ?? null))
  }, [activeMenu, tabKey, menus.length, dispatch, navigate])

  const Component = useMemo(() => {
    if (!activeMenu?.component) return null
    const path = `/src/pages/${activeMenu.component}.tsx`
    const loader = pageModules[path]
    if (!loader) return null
    return lazy(loader as () => Promise<{ default: React.ComponentType }>)
  }, [activeMenu?.component])

  const params = Object.fromEntries([...searchParams.entries()].filter(([k]) => k !== 'tab'))

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider theme="light" width={220}>
        <SiderMenu menus={useAppSelector(s => s.menu.tree)} activeTabKey={tabKey} />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: '#fff' }}>{/* HeaderBar TBD */}</Layout.Header>
        <Layout.Content style={{ padding: 16, background: '#f0f2f5' }}>
          {Component ? (
            <Suspense fallback={<Spin />}>
              <TabParamsContext.Provider value={params}>
                <Component />
              </TabParamsContext.Provider>
            </Suspense>
          ) : (
            <div>{menus.length === 0 ? 'Loading menus...' : 'Select a menu'}</div>
          )}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

// Minimal SiderMenu — flatten tree to antd Menu items
function SiderMenu({ menus, activeTabKey }: { menus: MenuDTO[]; activeTabKey: string | null }) {
  const navigate = useNavigate()

  const items = useMemo(() => buildMenuItems(menus), [menus])

  return (
    <Menu
      mode="inline"
      selectedKeys={activeTabKey ? [activeTabKey] : []}
      items={items}
      onClick={({ key }) => navigate(`/?tab=${key}`)}
    />
  )
}

function buildMenuItems(menus: MenuDTO[]): any[] {
  return menus
    .filter(m => m.visible !== false)
    .filter(m => m.type !== 3)
    .map(m => {
      const children = m.children?.length ? buildMenuItems(m.children) : undefined
      return {
        key: m.tabKey ?? `dir-${m.id}`,
        label: m.name,
        icon: m.icon ? <MenuIcon name={m.icon} /> : undefined,
        children,
      }
    })
}
```

Note: this Phase 5A version renders a **single** page at a time (no tabs). Multiple tabs come in Phase 5B.

### Step 16: Entry point

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from '@/app/providers'
import { AppRoutes } from '@/routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </StrictMode>,
)
```

Delete the Vite default styles in `index.css` and replace with Tailwind import + minimal reset:

```css
/* src/index.css */
@import 'tailwindcss';

html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

**Tailwind v4 note**: no `tailwind.config.js` needed (CSS-first config). The `@import 'tailwindcss'` directive + the `@tailwindcss/vite` plugin auto-scan all source files.

---

## 4. First end-to-end test — User list (or any single page)

Before scaffolding all features, build **one** page end-to-end to validate the foundation:

### 4.1 Create a minimal User list page

```
features/system/user/
├── api/index.ts
├── components/user-list-page.tsx
└── types.ts
```

```ts
// features/system/user/types.ts
export interface UserListItemDTO {
  id: number
  username: string
  nickname: string
  email?: string
  status: number
  createTime: string
}

export interface UserPageReqDTO {
  pageNo: number
  pageSize: number
}
```

```ts
// features/system/user/api/index.ts
import { http } from '@/shared/api/http-client'
import type { PageResult } from '@/shared/api/types'
import type { UserListItemDTO, UserPageReqDTO } from '../types'

export const userApi = {
  page: (params: UserPageReqDTO) =>
    http.get<PageResult<UserListItemDTO>>('/admin-api/system/user/page', { params }),
}
```

```tsx
// features/system/user/components/user-list-page.tsx
import { Card, Table } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { userApi } from '../api'
import { formatDateTime } from '@/shared/lib/format'

export default function UserListPage() {
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['user', 'list', { pageNo, pageSize }],
    queryFn: () => userApi.page({ pageNo, pageSize }),
  })

  return (
    <Card title="Users">
      <Table
        dataSource={data?.list ?? []}
        loading={isLoading}
        rowKey="id"
        columns={[
          { title: 'Username', dataIndex: 'username' },
          { title: 'Nickname', dataIndex: 'nickname' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Status', dataIndex: 'status' },
          { title: 'Create Time', dataIndex: 'createTime', render: formatDateTime },
        ]}
        pagination={{
          current: pageNo,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => {
            setPageNo(p)
            setPageSize(ps)
          },
        }}
      />
    </Card>
  )
}
```

```tsx
// src/pages/system/user/index.tsx
export { default } from '@/features/system/user/components/user-list-page'
```

### 4.2 Smoke test

```bash
# 1. Ensure BE is running with V1_0_8 migration applied
# 2. Ensure system_menu has tab_key='system-user' for the User Management menu

# 3. Start FE dev server
pnpm dev

# 4. Navigate to http://localhost:5173/login
# 5. Login with admin credentials
# 6. Sidebar should display the menu tree from BE
# 7. Click "User Management" — URL becomes /?tab=system-user
# 8. Table should render with user data from /admin-api/system/user/page
```

### 4.3 Validate

- [ ] Login succeeds, token stored in `localStorage`.
- [ ] `localStorage.getItem('soar_access_token')` shows the access token.
- [ ] `/get-permission-info` request includes `tenant-id` header (DevTools Network).
- [ ] Sidebar renders menus.
- [ ] Click menu → URL has `?tab=<key>` → page loads.
- [ ] F5 stays logged in (token survives, permission info re-fetched via AuthGuard rehydration).
- [ ] Logout (when implemented) clears token, redirects to /login.
- [ ] Unknown `?tab=xxx` → redirects to `/forbidden`.

---

## 5. Things deliberately deferred to later phases

These are scaffolded as empty/placeholder; build out in 5B/5C/5D:

- **TabBar** (Phase 5B)
- **Multiple open tabs in Redux** (Phase 5B — expand `tabs.slice`)
- **`<Activity>` keep-alive wrapping** (Phase 5C)
- **`HeaderBar`** with user dropdown, theme toggle, language switcher (Phase 5B)
- **Right-click context menu on tabs** (Phase 5B)
- **`HasPermission` component + `usePermission` hook** — needed soon (Phase 5D when buttons appear). Stub in Phase 5A.
- **`DictTag`, `DictSelect`, `useDict`** — needed Phase 5D. Stub in Phase 5A.
- **Full CRUD pattern (modal + create/update/delete)** — Phase 5D.
- **TanStack Query Devtools** wired but only useful when more queries exist.

---

## 6. Pitfalls to watch

1. **antd v6 + React 19**: should work, but verify `<App>` wrapper isn't needed for `message`/`notification` to render. If toasts don't appear, wrap children in `<App>` inside `ConfigProvider`.

2. **redux-persist + RTK**: `serializableCheck` warnings about non-serializable PERSIST actions. Already excluded in `store.ts` — verify no other warnings.

3. **Vite glob pattern**: `import.meta.glob('/src/pages/**/*.tsx')` keys are absolute paths starting with `/src/`. If you alias `@` to `/src`, do NOT use `@/pages/**` in glob — glob uses raw paths, not aliases.

4. **F5 rehydration timing**: AuthGuard uses `useEffect` to refetch permission-info. There's a brief render where `isLoggedIn=false` but token exists. Either show a global spinner or accept the flash. Don't redirect to `/login` if token exists.

5. **Refresh token endpoint takes refreshToken as query param**, NOT body. Note in the API spec (yudao convention).

6. **CommonResult code check**: 0 = success. NOT `data` truthiness. NOT HTTP 200. Don't shortcut.

7. **tenant-id MUST be sent on login**. Without it, BE returns 400 from `TenantSecurityWebFilter`. Tenant interceptor must run on EVERY request.

8. **First-time access without menus**: after login, before menus load, sidebar is empty. UX-wise this is fine for ~200ms. If too jarring, show a spinner over the layout while `s.menu.tree.length === 0`.

---

## 7. Definition of done (Phase 5A)

- [ ] `pnpm dev` boots successfully.
- [ ] `pnpm build` succeeds.
- [ ] `pnpm type-check` passes.
- [ ] Login → store token → fetch permission-info → land on `/`.
- [ ] Sidebar renders menus from BE.
- [ ] Clicking a menu navigates to `/?tab=<key>` and renders the corresponding page.
- [ ] At least one real page (e.g., User list with one column rendered from BE data) works end-to-end.
- [ ] F5 keeps user logged in.
- [ ] Logout clears state and redirects to `/login`.
- [ ] 401 from BE triggers refresh; if refresh fails, user is logged out.
- [ ] Theme toggle works (light ↔ dark via `themeSlice.setMode('dark')` dispatched manually for now — UI toggle in Phase 5B).
- [ ] i18n language switch works (`i18n.changeLanguage('vi')` manually for now).

---

## 8. Next phases preview

After 5A is in `main` and stable:

- **5B**: Build out `TabBar` + multi-tab state + right-click context menu. Refactor `AppShell` to render N tabs from Redux state (no `<Activity>` yet — switching unmounts/remounts).
- **5C**: Wrap each tab in `<Activity>`. Verify antd `Modal`/`Drawer` lifecycles, TanStack Query observer pausing, scroll restoration. Add `<App>` wrapper from antd for proper toast theming.
- **5D**: System CRUD pages (User, Role, Dept, Dict, Menu, Tenant) following the `crud-page.md` skill.
- **5E**: Infra pages.
- **5F**: Log pages.
- **5G**: Polish (theme toggle UI, language switcher UI, profile page).

---

**Document version**: 1.0
**Last updated**: 2026-06-05
