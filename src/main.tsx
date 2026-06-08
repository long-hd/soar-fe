import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppProviders from '@/app/providers'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { Button, Space, Typography } from 'antd'
import { themeActions } from '@/app/slices/theme-slice'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <Placeholder />
    </AppProviders>
  </StrictMode>,
)

/**
 * Verifies:
 * - Redux store wired (theme toggle dispatches + re-renders).
 * - i18n wired (language switcher updates t() calls).
 * - antd ConfigProvider responds to theme changes (button color).
 * - Tailwind layout classes apply.
 */
function Placeholder() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const mode = useAppSelector(s => s.theme.mode)

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language.startsWith('vi') ? 'en' : 'vi')
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-8">
      <Typography.Title>Soar is alive</Typography.Title>
      <Typography.Text type="secondary">{t('login.title')}</Typography.Text>
      <Space size="middle">
        <Button onClick={() => dispatch(themeActions.toggleMode())}>
          {t('appShell.theme')}:{' '}
          {mode === 'dark' ? t('appShell.themeDark') : t('appShell.themeLight')}
        </Button>
        <Button onClick={toggleLang}>
          {t('appShell.language')}: {i18n.language}
        </Button>
      </Space>
    </div>
  )
}
