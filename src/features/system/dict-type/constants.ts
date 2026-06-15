export const DICT_TYPE_PERMISSIONS = {
  query: 'system:dict:query',
  create: 'system:dict:create',
  update: 'system:dict:update',
  delete: 'system:dict:delete',
} as const

export const DICT_TYPE_DICT_TYPES = {
  status: 'common_status',
} as const

/** Matches BE `CommonStatusEnum`. */
export const DictTypeStatus = {
  ENABLED: 0,
  DISABLED: 1,
} as const
