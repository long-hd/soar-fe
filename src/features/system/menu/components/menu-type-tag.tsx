import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'

import { MENU_TYPE, MENU_TYPE_TAG_MAP, type MenuType } from '../constants'

interface MenuTypeTagProps {
  type: number
}

function getMenuTypeLabelKey(type: number): 'dir' | 'menu' | 'button' {
  if (type === MENU_TYPE.DIR) return 'dir'
  if (type === MENU_TYPE.MENU) return 'menu'
  return 'button'
}

/** Feature-local type badge for table column — not a BE dict. */
export function MenuTypeTag({ type }: MenuTypeTagProps) {
  const { t } = useTranslation()
  const color = MENU_TYPE_TAG_MAP[type as MenuType] ?? 'default'
  return <Tag color={color}>{t(`systemMenu.type.${getMenuTypeLabelKey(type)}`)}</Tag>
}
