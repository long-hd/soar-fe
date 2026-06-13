# A1 — Permission Infrastructure

> Single block. Builds `usePermission()` hook + `<HasPermission>` + `<HasRole>` components.

---

## Scope

3 files (one is replacement of an existing 0-byte placeholder):

1. `src/features/permission/hooks/use-permission.ts` — replace empty placeholder
2. `src/features/permission/components/has-permission.tsx` — new
3. `src/features/permission/components/has-role.tsx` — new
4. `src/features/permission/index.ts` — new barrel for clean imports

No changes to:

- `auth-slice.ts` (already stores `permissions: string[]` + `roles: string[]`)
- `sider-menu.tsx` (BE filters menus server-side per role/permission — defensive client filter deferred)
- Any other file

---

## Convention summary

Aligned with yudao + Soar BE:

- **Permissions** are strings like `system:user:create`. BE seeds button menus with these codes.
- **Wildcard** `*:*:*` = full access. BE inflates super_admin's `permissions` array with this. Client only checks for the literal string — no glob parsing.
- **Roles** are strings like `super_admin`, `tenant_admin`. BE `RoleCodeEnum.SUPER_ADMIN = "super_admin"`.
- **Super_admin bypasses role checks too**: any `hasRole(...)` / `hasAnyRole(...)` returns `true` if user is super_admin. Matches yudao's `checkRole()` semantics.
- **Logged-out behavior**: `permissions=[]`, `roles=[]` → every check returns `false`, fallback rendered. Safe default (AuthGuard route protection prevents this in normal flow anyway).

---

## 1. `src/features/permission/hooks/use-permission.ts` (replace empty file)

```typescript
import { useMemo } from 'react'
import { selectPermissions, selectRoles } from '@/app/slices/auth-slice'
import { useAppSelector } from '@/app/store'

/**
 * Permission + role check API.
 *
 * Wildcard semantics (yudao parity):
 *  - Any permission check passes if the user has the wildcard `*:*:*` in their
 *    permissions array. BE inflates this for super_admin during `/auth/get-permission-info`,
 *    so the client only checks for the literal string.
 *  - Any role check passes if the user has the `super_admin` role, regardless of
 *    which role(s) were requested. This matches yudao's `checkRole()` behavior:
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
```

### Design notes

- **Set vs `Array.includes()`**: permissions can be hundreds of items for a privileged role. `Set.has()` is O(1); `Array.includes()` is O(n). Cheap perf win at no readability cost.
- **`readonly string[]` params**: lets callers pass tuples/literal arrays without copy. Internal API.
- **No `useCallback` per method**: the entire result object is memoized; callers destructuring methods get stable references for the lifetime of the underlying state. Sufficient for most consumers.
- **No `false` early-return on empty arrays**: `hasAny([])` returns `false` (correct: "any of zero things" is vacuously false). `hasAll([])` returns `true` (vacuous truth). Matches lodash convention.

---

## 2. `src/features/permission/components/has-permission.tsx`

```tsx
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
 *
 * Single code:
 *   <HasPermission code="system:user:create">
 *     <Button>Create</Button>
 *   </HasPermission>
 *
 * Any of:
 *   <HasPermission code={['system:user:update', 'system:user:update-password']}>
 *     <ActionsMenu />
 *   </HasPermission>
 *
 * All of:
 *   <HasPermission code={['system:user:read', 'system:role:read']} mode="all">
 *     <UserRoleMatrix />
 *   </HasPermission>
 *
 * With fallback (e.g., disabled button for visibility-but-no-action):
 *   <HasPermission code="system:user:delete" fallback={<Button disabled>Delete</Button>}>
 *     <Button danger onClick={onDelete}>Delete</Button>
 *   </HasPermission>
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
```

---

## 3. `src/features/permission/components/has-role.tsx`

```tsx
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
 *   <HasRole role="tenant_admin">
 *     <TenantSettingsLink />
 *   </HasRole>
 *
 *   <HasRole role={['auditor', 'compliance_officer']}>
 *     <AuditLogPanel />
 *   </HasRole>
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
```

---

## 4. `src/features/permission/index.ts` (barrel)

```typescript
export { usePermission } from './hooks/use-permission'
export type { UsePermissionResult } from './hooks/use-permission'
export { HasPermission } from './components/has-permission'
export { HasRole } from './components/has-role'
```

Allows consumers to:

```tsx
import { HasPermission, HasRole, usePermission } from '@/features/permission'
```

Instead of:

```tsx
import { HasPermission } from '@/features/permission/components/has-permission'
import { usePermission } from '@/features/permission/hooks/use-permission'
```

---

## Smoke test

Manual — Phase 5B doesn't have a CRUD page yet, but the components are testable inline.

### Test setup

Add a temporary test block to the welcome screen (or any visible component) — verify, then revert. Example for `tab-renderer.tsx`'s welcome branch:

```tsx
import { HasPermission, HasRole, usePermission } from '@/features/permission'

// Inside the welcome render:
const { isSuperAdmin } = usePermission()
return (
  <div>
    <Result icon={...} title={...} subTitle={...} />
    <div style={{ padding: 24 }}>
      <p>isSuperAdmin: {String(isSuperAdmin)}</p>

      <HasPermission code="system:user:create">
        <p>✅ Can create user</p>
      </HasPermission>

      <HasPermission code="nonexistent:permission" fallback={<p>❌ No fake permission</p>}>
        <p>This should not show</p>
      </HasPermission>

      <HasPermission code={['system:user:create', 'system:user:update']} mode="all">
        <p>✅ Has BOTH user:create AND user:update</p>
      </HasPermission>

      <HasRole role="super_admin">
        <p>✅ Is super_admin</p>
      </HasRole>
    </div>
  </div>
)
```

| #    | As                                                                    | Expected output                                                    |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A1-1 | Logged-in super_admin                                                 | All ✅ lines shown. `isSuperAdmin: true`. Fallback line NOT shown. |
| A1-2 | Logged-in user WITHOUT `system:user:create`                           | "Can create user" line hidden. `isSuperAdmin: false`.              |
| A1-3 | Logged-in user with `system:user:create` but not `system:user:update` | "Can create user" ✅ shown. "Has BOTH..." line hidden (mode=all).  |
| A1-4 | Logout, look at any auth-gated UI                                     | All `<HasPermission>` content hidden (permissions=[]).             |

After verifying, **remove the test block** from `tab-renderer.tsx`. The components themselves stay.

---

## Apply checklist

- [ ] Fill `src/features/permission/hooks/use-permission.ts` (currently 0 bytes).
- [ ] Create `src/features/permission/components/has-permission.tsx`.
- [ ] Create `src/features/permission/components/has-role.tsx`.
- [ ] Create `src/features/permission/index.ts`.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm lint` passes.
- [ ] (Optional) Inject test block in welcome screen → run smoke A1-1..A1-4 → revert.

---

## Tech debt opened by A1

| #      | Item                                                                                                                                                                       | Defer until                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A1-TD1 | No client-side sider menu filter (BE filters server-side). Defensive double-filter not implemented.                                                                        | Add only if BE bug or security audit requires it.                                  |
| A1-TD2 | No "soft mode" — disabled buttons via `fallback` work but require caller to pass the disabled variant manually. Could add `<HasPermission code="..." disabled>` shorthand. | When repeated pattern emerges in CRUD pages.                                       |
| A1-TD3 | No permission code constants. Strings are inline (e.g., `"system:user:create"`). Yudao has same approach — codes are exact strings from BE seed, not enum-ed.              | Defer indefinitely. If typos become an issue, generate constants from BE seed SQL. |

---

**End A1. Awaiting confirmation before A2 (Dict infra — needs BE endpoint verification first).**
