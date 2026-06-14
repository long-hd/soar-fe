// ===== Permission codes =====

export const ROLE_PERMISSIONS = {
  query: 'system:role:query',
  create: 'system:role:create',
  update: 'system:role:update',
  delete: 'system:role:delete',
} as const

// ===== Dict types =====

export const ROLE_DICT_TYPES = {
  status: 'common_status',
  type: 'system_role_type',
} as const

// ===== Enum values (BE source of truth) =====

/** Matches BE `CommonStatusEnum`. */
export const ROLE_STATUS = {
  ENABLED: 0,
  DISABLED: 1,
} as const

/** Matches BE `RoleTypeEnum`. */
export const ROLE_TYPE = {
  SYSTEM: 1,
  CUSTOM: 2,
} as const
