import { Avatar, Button, Dropdown, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { logout, selectUser } from '@/app/slices/auth-slice'
import { selectSiderCollapsed, selectThemeMode, themeActions } from '@/app/slices/theme-slice'

/**
 * Top header bar.
 *
 * Left: sider collapse toggle (kept inline — frequent action, must stay easy).
 *
 * Right: user dropdown — Avatar + nickname + caret. Click expands to:
 *  - Profile (TODO: adds /profile route)
 *  - Theme: nested sub-menu, Light / Dark with check icon
 *  - Language: nested sub-menu, English / Tiếng Việt with check icon
 *  - Sign out: danger-styled
 *
 * Logout uses explicit navigate to avoid AuthGuard redirect noise
 */
export default function HeaderBar() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const collapsed = useAppSelector(selectSiderCollapsed)
  const mode = useAppSelector(selectThemeMode)
  const user = useAppSelector(selectUser)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login', { replace: true })
  }

  const displayName = user?.nickname ?? user?.username ?? ''
  const avatarLetter = displayName.charAt(0).toUpperCase() || '?'
  const currentLang = i18n.language.startsWith('vi') ? 'vi' : 'en'

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <Icon icon="ant-design:user-outlined" />,
      label: t('appShell.profile'),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'theme',
      icon: <Icon icon="ant-design:bulb-outlined" />,
      label: t('appShell.theme'),
      children: [
        {
          key: 'theme-light',
          icon:
            mode === 'light' ? (
              <Icon icon="ant-design:check-outlined" />
            ) : (
              <span style={{ display: 'inline-block', width: 14 }} />
            ),
          label: t('appShell.themeLight'),
          onClick: () => dispatch(themeActions.setMode('light')),
        },
        {
          key: 'theme-dark',
          icon:
            mode === 'dark' ? (
              <Icon icon="ant-design:check-outlined" />
            ) : (
              <span style={{ display: 'inline-block', width: 14 }} />
            ),
          label: t('appShell.themeDark'),
          onClick: () => dispatch(themeActions.setMode('dark')),
        },
      ],
    },
    {
      key: 'language',
      icon: <Icon icon="ant-design:global-outlined" />,
      label: t('appShell.language'),
      children: [
        {
          key: 'lang-en',
          icon:
            currentLang === 'en' ? (
              <Icon icon="ant-design:check-outlined" />
            ) : (
              <span style={{ display: 'inline-block', width: 14 }} />
            ),
          label: 'English',
          onClick: () => i18n.changeLanguage('en'),
        },
        {
          key: 'lang-vi',
          icon:
            currentLang === 'vi' ? (
              <Icon icon="ant-design:check-outlined" />
            ) : (
              <span style={{ display: 'inline-block', width: 14 }} />
            ),
          label: 'Tiếng Việt',
          onClick: () => i18n.changeLanguage('vi'),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <Icon icon="ant-design:logout-outlined" />,
      label: t('appShell.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ]

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

      <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" trigger={['click']}>
        <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
          <Space size={8}>
            <Avatar
              size="small"
              src={user?.avatar || undefined}
              style={{ backgroundColor: user?.avatar ? undefined : '#1677ff' }}
            >
              {avatarLetter}
            </Avatar>
            <Typography.Text>{displayName}</Typography.Text>
            <Icon icon="ant-design:down-outlined" fontSize={10} />
          </Space>
        </Button>
      </Dropdown>
    </div>
  )
}
