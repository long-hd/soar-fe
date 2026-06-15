export const DEPT_PERMISSIONS = {
  query: 'system:dept:query',
  create: 'system:dept:create',
  update: 'system:dept:update',
  delete: 'system:dept:delete',
} as const

export const DEPT_DICT_TYPES = {
  status: 'common_status',
} as const

/** Matches BE `CommonStatusEnum`. */
export const DEPT_STATUS = {
  ENABLED: 0,
  DISABLED: 1,
} as const
