import { useMemo } from 'react'
import { selectPermissions, selectRoles } from '@/app/slices/auth-slice'
import { useAppSelector } from '@/app/store'

/**
 * Permission + role check API.
 *
 * Wildcard semantics (legacy parity):
 *  - Any permission check passes if the user has the wildcard `*:*:*` in their
 *    permissions array. BE inflates this for super_admin during `/auth/get-permission-info`,
 *    so the client only checks for the literal string.
 *  - Any role check passes if the user has the `super_admin` role, regardless of
 *    which role(s) were requested. This matches legacy's `checkRole()` behavior:
 *    "super_admin has access to everything".
 */
export interface UsePermissionResult {
  /** True if the user has the given permission code (or has wildcard `*:*:*`). */
  has(code: string): boolean
  /** True if the user has ANY of the given codes. */
  hasAny(codes: readonly string[]): boolean
  /** True if the user has ALL of the given codes. */
  hasAll(codes: readonly string[]): boolean
  /** True if the user has the given role, or is super_admin. */
  hasRole(role: string): boolean
  /** True if the user has ANY of the given roles, or is super_admin. */
  hasAnyRole(roles: readonly string[]): boolean
  /** True if the user has the `super_admin` role. */
  isSuperAdmin: boolean
}

const WILDCARD = '*:*:*'
const SUPER_ADMIN = 'super_admin'

export function usePermission(): UsePermissionResult {
  const permissions = useAppSelector(selectPermissions)
  const roles = useAppSelector(selectRoles)

  // Memoize against the underlying string arrays. Redux returns reference-stable
  // arrays unless the slice updates, so this rebuild rate matches login / refresh.
  return useMemo<UsePermissionResult>(() => {
    const permSet = new Set(permissions)
    const roleSet = new Set(roles)
    const hasWildcard = permSet.has(WILDCARD)
    const isSuperAdmin = roleSet.has(SUPER_ADMIN)

    function has(code: string): boolean {
      return hasWildcard || permSet.has(code)
    }
    function hasAny(codes: readonly string[]): boolean {
      if (hasWildcard) return true
      for (const c of codes) {
        if (permSet.has(c)) return true
      }
      return false
    }
    function hasAll(codes: readonly string[]): boolean {
      if (hasWildcard) return true
      for (const c of codes) {
        if (!permSet.has(c)) return false
      }
      return true
    }
    function hasRole(role: string): boolean {
      return isSuperAdmin || roleSet.has(role)
    }
    function hasAnyRole(rolesToCheck: readonly string[]): boolean {
      if (isSuperAdmin) return true
      for (const r of rolesToCheck) {
        if (roleSet.has(r)) return true
      }
      return false
    }

    return { has, hasAny, hasAll, hasRole, hasAnyRole, isSuperAdmin }
  }, [permissions, roles])
}
