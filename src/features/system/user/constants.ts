/**
 * Module-level constants for user CRUD.
 *
 * Permission codes mirror BE seed in V1_0_9 (system_menu). Exact strings —
 * mistypes here will silently fail permission checks. If typos become an
 * issue across modules, generate constants from BE seed SQL (tracker A1-TD3,
 * deferred indefinitely).
 *
 * Dict types mirror BE seed (system_dict_type). Used by `<DictSelect>` and
 * `<DictTag>` consumers.
 *
 * Enum values mirror BE enum constants (UserStatusEnum, SexEnum). Const
 * objects rather than TS `enum` — better DCE + simpler interop with the
 * `number` types in our DTOs.
 */

// ===== Permission codes =====

export const USER_PERMISSIONS = {
  query: 'system:user:query',
  create: 'system:user:create',
  update: 'system:user:update',
  delete: 'system:user:delete',
  updatePassword: 'system:user:update-password',
} as const

// ===== Dict types =====

export const USER_DICT_TYPES = {
  status: 'common_status',
  sex: 'system_user_sex',
} as const

// ===== Enum values (BE source of truth) =====

/** Matches BE `CommonStatusEnum`. */
export const UserStatus = {
  ENABLED: 0,
  DISABLED: 1,
} as const

/** Matches BE `SexEnum`. */
export const UserSex = {
  MALE: 1,
  FEMALE: 2,
  UNKNOWN: 3,
} as const
