// ===== Permission codes =====

export const POST_PERMISSIONS = {
  query: 'system:post:query',
  create: 'system:post:create',
  update: 'system:post:update',
  delete: 'system:post:delete',
} as const

// ===== Dict types =====

export const POST_DICT_TYPES = {
  status: 'common_status',
} as const

// ===== Enum values (BE source of truth) =====

/** Matches BE `CommonStatusEnum`. */
export const POST_STATUS = {
  ENABLED: 0,
  DISABLED: 1,
} as const
