import type { ReactNode } from 'react'
import { usePermission } from '@/features/permission/hooks/use-permission'

interface HasPermissionProps {
  /**
   * Permission code(s) required to render `children`.
   * - String: single code check.
   * - String[]: check against `mode` (default 'any').
   */
  code: string | readonly string[]
  /** Only relevant when `code` is an array. Default: `'any'`. */
  mode?: 'any' | 'all'
  /** Rendered when the user lacks the required permission. Default: `null`. */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Conditionally renders `children` based on the user's permission codes.
 *
 * Examples:
 * ```ts
 * // Single code:
 *   <HasPermission code="system:user:create">
 *     <Button>Create</Button>
 *   </HasPermission>
 *
 * // Any of:
 *   <HasPermission code={['system:user:update', 'system:user:update-password']}>
 *     <ActionsMenu />
 *   </HasPermission>
 *
 * // All of:
 *   <HasPermission code={['system:user:read', 'system:role:read']} mode="all">
 *     <UserRoleMatrix />
 *   </HasPermission>
 *
 * // With fallback (e.g., disabled button for visibility-but-no-action):
 *   <HasPermission code="system:user:delete" fallback={<Button disabled>Delete</Button>}>
 *     <Button danger onClick={onDelete}>Delete</Button>
 *   </HasPermission>
 * ```
 */
export function HasPermission({
  code,
  mode = 'any',
  fallback = null,
  children,
}: HasPermissionProps) {
  const { has, hasAny, hasAll } = usePermission()

  let allowed: boolean
  if (typeof code === 'string') {
    allowed = has(code)
  } else if (mode === 'all') {
    allowed = hasAll(code)
  } else {
    allowed = hasAny(code)
  }

  return <>{allowed ? children : fallback}</>
}
