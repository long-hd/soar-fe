import { Button, Space, Typography } from 'antd'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { logout, selectUser } from '@/app/slices/auth-slice'
import { selectSiderCollapsed, themeActions, selectThemeMode } from '@/app/slices/theme-slice'

/**
 * Top header. sider trigger left, user controls right, proper user dropdown (avatar + nickname + sub-menu).
 *
 * Logout handler navigates explicitly to `/login` to avoid the AuthGuard
 * redirect noise (`/login?redirect=%2F`).
 */
export default function HeaderBar() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const mode = useAppSelector(selectThemeMode)
  const collapsed = useAppSelector(selectSiderCollapsed)
  const user = useAppSelector(selectUser)

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language.startsWith('vi') ? 'en' : 'vi')
  }

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full items-center justify-between px-4">
      <Button
        type="text"
        size="large"
        icon={
          <Icon
            icon={collapsed ? 'ant-design:menu-unfold-outlined' : 'ant-design:menu-fold-outlined'}
            fontSize={20}
          />
        }
        onClick={() => dispatch(themeActions.toggleSiderCollapsed())}
        aria-label="Toggle sider"
      />

      <Space size="middle">
        <Typography.Text>{user?.nickname ?? user?.username ?? ''}</Typography.Text>
        <Button onClick={() => dispatch(themeActions.toggleMode())}>
          {mode === 'dark' ? t('appShell.themeDark') : t('appShell.themeLight')}
        </Button>
        <Button onClick={toggleLang}>{i18n.language.toUpperCase()}</Button>
        <Button danger onClick={handleLogout}>
          {t('appShell.logout')}
        </Button>
      </Space>
    </div>
  )
}
