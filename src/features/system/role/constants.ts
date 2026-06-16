// ===== Permission codes =====

export const ROLE_PERMISSIONS = {
  query: 'system:role:query',
  create: 'system:role:create',
  update: 'system:role:update',
  delete: 'system:role:delete',
  assignDataScope: 'system:permission:assign-role-data-scope',
  assignMenu: 'system:permission:assign-role-menu',
} as const

// ===== Dict types =====

export const ROLE_DICT_TYPES = {
  status: 'common_status',
  type: 'system_role_type',
  dataScope: 'system_data_scope',
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

/** Matches BE `DataScopeEnum`. */
export const ROLE_DATA_SCOPE = {
  ALL: 1,
  DEPT_CUSTOM: 2,
  DEPT_ONLY: 3,
  DEPT_AND_CHILD: 4,
  SELF: 5,
} as const
