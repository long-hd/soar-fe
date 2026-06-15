import { Select, Space, Tag } from 'antd'
import { useTranslation } from 'react-i18next'

import { COLOR_TYPE_OPTIONS, COLOR_TYPE_TAG_MAP } from '../constants'
import type { ColorType } from '../types'

interface ColorTypeSelectProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  style?: React.CSSProperties
}

/**
 * Feature-local select for dict-data `colorType` field.
 * Options show an antd Tag preview (color swatch + label).
 */
export function ColorTypeSelect({
  value,
  onChange,
  placeholder,
  allowClear,
  style,
}: ColorTypeSelectProps) {
  const { t } = useTranslation()

  const renderOption = (colorType: ColorType) => (
    <Tag color={COLOR_TYPE_TAG_MAP[colorType]}>{t(`systemDictData.colorType.${colorType}`)}</Tag>
  )

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      allowClear={allowClear}
      style={style}
      options={COLOR_TYPE_OPTIONS.map(opt => ({
        value: opt.value,
        label: <Space size={4}>{renderOption(opt.value)}</Space>,
      }))}
      labelRender={({ value: selected }) => {
        if (!selected) return null
        return renderOption(selected as ColorType)
      }}
    />
  )
}
