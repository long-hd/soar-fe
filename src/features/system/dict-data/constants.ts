import type { ColorType } from './types'

export const DICT_DATA_PERMISSIONS = {
  query: 'system:dict:query',
  create: 'system:dict:create',
  update: 'system:dict:update',
  delete: 'system:dict:delete',
} as const

export const DICT_DATA_DICT_TYPES = {
  status: 'common_status',
} as const

/** Matches BE `CommonStatusEnum`. */
export const DictDataStatus = {
  ENABLED: 0,
  DISABLED: 1,
} as const

/** BE colorType seed values → antd Tag preset (same map as DictTag). */
export const COLOR_TYPE_TAG_MAP: Record<ColorType, string> = {
  default: 'default',
  primary: 'blue',
  success: 'green',
  info: 'cyan',
  warning: 'orange',
  danger: 'red',
}

export const COLOR_TYPE_OPTIONS: { value: ColorType; labelKey: ColorType }[] = [
  { value: 'default', labelKey: 'default' },
  { value: 'primary', labelKey: 'primary' },
  { value: 'success', labelKey: 'success' },
  { value: 'info', labelKey: 'info' },
  { value: 'warning', labelKey: 'warning' },
  { value: 'danger', labelKey: 'danger' },
]
