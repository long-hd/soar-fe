import { Menu as AntMenu } from 'antd'
import type { MenuProps } from 'antd'
import { Icon } from '@iconify/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/app/store'
import { selectMenus } from '@/app/slices/auth-slice'
import type { MenuDTO } from '@/features/auth/types'

/**
 * Sidebar menu rendered from Redux `auth.menus` tree.
 *
 * Pattern from legacy Menu.vue + useRenderMenuItem.tsx — adapted: antd Menu
 * `items` prop handles recursion automatically, no custom render functions
 * needed.
 *
 * Active key tracking: `?tab=<key>` URL search param. Click handler updates
 * URL via navigate — TabRenderer (C3) picks up the change and swaps content.
 *
 * Parent groups (menu nodes without `tabKey`) get a synthetic key so antd
 * can render them. Click on synthetic key is ignored — only expands/collapses
 * the group. (antd Menu requires `key` on every item.)
 *
 * Phase defers:
 *  - Sort: BE returns ORDER BY sort already; no client sort.
 *  - Permission filter: super admin sees all; non-admin filtering.
 *  - i18n labels: menu `name` rendered raw.
 *  - parentTabKey for detail-page highlight.
 */

const SYNTHETIC_PARENT_KEY_PREFIX = '_no_tab_'

function buildItems(menus: MenuDTO[] | undefined): MenuProps['items'] {
  if (!menus || menus.length === 0) return []
  return menus
    .filter(m => m.visible)
    .map(m => {
      const hasChildren = Array.isArray(m.children) && m.children.length > 0
      return {
        key: m.tabKey ?? `${SYNTHETIC_PARENT_KEY_PREFIX}${m.id}`,
        icon: m.icon ? <Icon icon={m.icon} /> : undefined,
        label: m.name,
        children: hasChildren ? buildItems(m.children) : undefined,
      }
    })
}

export default function SiderMenu() {
  const menus = useAppSelector(selectMenus)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const activeTabKey = searchParams.get('tab') ?? ''

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith(SYNTHETIC_PARENT_KEY_PREFIX)) return
    navigate(`/?tab=${key}`)
  }

  return (
    <AntMenu
      mode="inline"
      items={buildItems(menus)}
      selectedKeys={[activeTabKey]}
      onClick={onClick}
      style={{ borderRight: 0 }}
    />
  )
}
