import { type ReactNode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { I18nextProvider } from 'react-i18next'
import { App, ConfigProvider, Spin, theme as antdTheme } from 'antd'
import i18n from '@/shared/i18n'
import TenantBootGate from '@/features/auth/components/tenant-boot-gate'
import { persistor, store, useAppSelector } from './store'
import { queryClient } from './query-client'
import { AntdAppRefBridge } from '@/shared/lib/antd-app-ref'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * App composition root. Order from outermost to innermost:
 *  1. ReduxProvider — store available to every nested provider/component.
 *  2. PersistGate — defers render until redux-persist rehydrates. Shows
 *     centered Spin during rehydrate.
 *  3. QueryClientProvider — TanStack Query state.
 *  4. I18nextProvider — i18n context.
 *  5. AntdThemeBridge — antd ConfigProvider + <App> + AntdAppRefBridge.
 *     ConfigProvider subscribes to theme-slice; <App> provides message/modal/
 *     notification context; AntdAppRefBridge mirrors App.useApp() to a module
 *     ref for non-component callers (interceptors, thunks).
 *     Inside Redux so it can use useAppSelector.
 *  6. TenantBootGate — boot-time tenant resolve + bootstrapAuth.
 *  7. children — RouterProvider rendered by main.tsx.
 *
 * PersistGate loading note: rendered BEFORE AntdThemeBridge applies dark
 * mode, so the Spin shows in default antd light theme even if user's
 * persisted preference is dark. Brief (<100ms typically), acceptable.
 */
export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <PersistGate loading={<RehydrateSpinner />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <AntdThemeBridge>
              <TenantBootGate>{children}</TenantBootGate>
            </AntdThemeBridge>
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </I18nextProvider>
        </QueryClientProvider>
      </PersistGate>
    </ReduxProvider>
  )
}

/** Full-screen spinner shown while redux-persist rehydrates from storage. */
function RehydrateSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spin size="large" />
    </div>
  )
}

/** Bridges Redux theme-slice to antd ConfigProvider. */
function AntdThemeBridge({ children }: { children: ReactNode }) {
  const mode = useAppSelector(state => state.theme.mode)
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <App>
        <AntdAppRefBridge />
        {children}
      </App>
    </ConfigProvider>
  )
}
