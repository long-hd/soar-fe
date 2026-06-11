import type { ReactNode } from 'react'
import { usePermission } from '@/features/permission/hooks/use-permission'

interface HasRoleProps {
  /**
   * Role code(s) required to render `children`.
   * - String: single role check (super_admin always passes).
   * - String[]: check against `mode` (default 'any'). super_admin always passes.
   */
  role: string | readonly string[]
  /** Only relevant when `role` is an array. Default: `'any'`. */
  mode?: 'any' | 'all'
  /** Rendered when the user lacks the required role. Default: `null`. */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Conditionally renders `children` based on the user's roles.
 *
 * Note: `super_admin` always passes any role check (matches yudao + Soar BE semantics).
 *
 * Examples:
 *
 * ``` ts
 *   <HasRole role="tenant_admin">
 *     <TenantSettingsLink />
 *   </HasRole>
 *
 *   <HasRole role={['auditor', 'compliance_officer']}>
 *     <AuditLogPanel />
 *   </HasRole>
 * ```
 *
 * Note on usage: prefer `<HasPermission>` for action-level gating (more granular,
 * matches BE button-permission seeds). Use `<HasRole>` only when the UI logic is
 * intrinsically tied to a role concept (e.g., showing role-specific landing pages).
 */
export function HasRole({ role, mode = 'any', fallback = null, children }: HasRoleProps) {
  const { hasRole, hasAnyRole } = usePermission()

  let allowed: boolean
  if (typeof role === 'string') {
    allowed = hasRole(role)
  } else if (mode === 'all') {
    // Strict: user must have every requested role (super_admin still passes via hasRole).
    allowed = role.every(r => hasRole(r))
  } else {
    allowed = hasAnyRole(role)
  }

  return <>{allowed ? children : fallback}</>
}
