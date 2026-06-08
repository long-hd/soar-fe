/**
 * Permission code matcher.
 *
 * - Single-code check: `hasPermission(userPerms, 'system:user:create')`
 * - Any-of check: `hasPermission(userPerms, ['system:user:create', 'system:user:update'])`
 *
 * Wildcard `*:*:*` in userPerms grants everything (defensive: legacy FE has this branch
 * but legacy BE never emits it. Soar BE currently enumerates all menu codes for
 * super-admin, so this branch is dead in practice today — kept for forward-compat).
 */

const SUPER_ADMIN_WILDCARD = '*:*:*'

export function hasPermission(
  userPerms: readonly string[],
  required: string | readonly string[],
): boolean {
  if (userPerms.includes(SUPER_ADMIN_WILDCARD)) return true
  if (typeof required === 'string') {
    return userPerms.includes(required)
  }
  return required.some(code => userPerms.includes(code))
}
