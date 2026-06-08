import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppProviders from '@/app/providers'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { Button, Space, Typography } from 'antd'
import { themeActions } from '@/app/slices/theme-slice'
import { logout, selectIsAuthed, selectUser } from '@/app/slices/auth-slice'
import LoginPage from '@/pages/login/login-page'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppContent />
    </AppProviders>
  </StrictMode>,
)

/**
 * Block B stub router. C1 will replace this with `createBrowserRouter`:
 *  /login            → <LoginPage>
 *  /                 → <AuthGuard><AppShell>...</AppShell></AuthGuard>
 *  /forbidden        → <ForbiddenPage>
 *  /*                → <NotFoundPage>
 *
 * For Block B, simple `isAuthed` switch is enough to demo end-to-end auth.
 */
function AppContent() {
  const isAuthed = useAppSelector(selectIsAuthed)
  return isAuthed ? <Placeholder /> : <LoginPage />
}

/**
 * Block A placeholder — extended in B4 with user info + logout button.
 * Replaced by AppShell in C2.
 */
function Placeholder() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const mode = useAppSelector(s => s.theme.mode)
  const user = useAppSelector(selectUser)

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language.startsWith('vi') ? 'en' : 'vi')
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-8">
      <Typography.Title>Soar is alive 🚀</Typography.Title>
      <Typography.Text type="secondary">
        Logged in as: <strong>{user?.nickname ?? user?.username ?? '(unknown)'}</strong>
      </Typography.Text>
      <Space size="middle" wrap>
        <Button onClick={() => dispatch(themeActions.toggleMode())}>
          {t('appShell.theme')}:{' '}
          {mode === 'dark' ? t('appShell.themeDark') : t('appShell.themeLight')}
        </Button>
        <Button onClick={toggleLang}>
          {t('appShell.language')}: {i18n.language}
        </Button>
        <Button danger onClick={() => dispatch(logout())}>
          {t('appShell.logout')}
        </Button>
      </Space>
    </div>
  )
}
