import { Select, Space } from 'antd'
import { useTranslation } from 'react-i18next'

import { MENU_TYPE_OPTIONS } from '../constants'
import { MenuTypeTag } from './menu-type-tag'

interface MenuTypeSelectProps {
  value?: number
  onChange?: (value: number) => void
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
}

/**
 * Feature-local select for menu `type` field.
 * Options show an antd Tag preview (colored label per MenuTypeEnum).
 */
export function MenuTypeSelect({
  value,
  onChange,
  placeholder,
  disabled,
  style,
}: MenuTypeSelectProps) {
  const { t } = useTranslation()

  const renderOption = (type: number) => <MenuTypeTag type={type} />

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? t('systemMenu.form.typePlaceholder')}
      disabled={disabled}
      style={style}
      options={MENU_TYPE_OPTIONS.map(opt => ({
        value: opt.value,
        label: <Space size={4}>{renderOption(opt.value)}</Space>,
      }))}
      labelRender={({ value: selected }) => {
        if (selected == null) return null
        return renderOption(selected as number)
      }}
    />
  )
}
