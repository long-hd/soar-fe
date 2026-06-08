import { type ReactNode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { I18nextProvider } from 'react-i18next'
import { ConfigProvider, theme as antdTheme } from 'antd'
import i18n from '@/shared/i18n'
import TenantBootGate from '@/features/auth/components/tenant-boot-gate'
import { persistor, store, useAppSelector } from '@/app/store'
import { queryClient } from '@/app/query-client'

interface AppProvidersProps {
  children: ReactNode
}
/**
 * App composition root. Order matters:
 *  1. ReduxProvider — outermost so all inner providers can read state
 *     (notably AntdThemeBridge reads theme-slice).
 *  2. PersistGate — defers render until redux-persist rehydrates.
 *  3. QueryClientProvider — TanStack Query state.
 *  4. I18nextProvider — i18n context (must wrap antd so antd locale could
 *     react to i18n changes later).
 *  5. AntdThemeBridge — antd ConfigProvider subscribing to theme-slice.
 *     Split into child component so it can call useAppSelector.
 */
export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
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

/** Bridges Redux theme-slice to antd ConfigProvider. */
function AntdThemeBridge({ children }: { children: ReactNode }) {
  const mode = useAppSelector(state => state.theme.mode)
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  )
}
