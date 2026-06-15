/** Matches BE `MenuTypeEnum`. */
export const MENU_TYPE = {
  DIR: 1,
  MENU: 2,
  BUTTON: 3,
} as const

export type MenuType = (typeof MENU_TYPE)[keyof typeof MENU_TYPE]

export const MENU_PERMISSIONS = {
  query: 'system:menu:query',
  create: 'system:menu:create',
  update: 'system:menu:update',
  delete: 'system:menu:delete',
} as const

export const MENU_DICT_TYPES = {
  status: 'common_status',
} as const

/** Matches BE `CommonStatusEnum`. */
export const MENU_STATUS = {
  ENABLED: 0,
  DISABLED: 1,
} as const

export const MENU_TYPE_TAG_MAP: Record<MenuType, string> = {
  [MENU_TYPE.DIR]: 'blue',
  [MENU_TYPE.MENU]: 'green',
  [MENU_TYPE.BUTTON]: 'orange',
}

export const MENU_TYPE_OPTIONS: { value: MenuType }[] = [
  { value: MENU_TYPE.DIR },
  { value: MENU_TYPE.MENU },
  { value: MENU_TYPE.BUTTON },
]
