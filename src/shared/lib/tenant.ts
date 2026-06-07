/**
 * Tenant identification storage helpers.
 * Tenant is resolved at app boot via `getTenantByWebsite(location.host)` — see
 * `features/auth/components/tenant-boot-gate.tsx`. No env var fallback by design.
 *
 * - `tenantId`: primary tenant the logged-in user belongs to.
 * - `visitTenantId`: super-admin "view as another tenant" override; sent as
 *    `visit-tenant-id` header alongside `tenant-id` to let BE switch context
 *    on a per-request basis without re-login.
 */

const TENANT_ID_KEY = 'SOAR_TENANT_ID'
const VISIT_TENANT_ID_KEY = 'SOAR_VISIT_TENANT_ID'

function readNumeric(key: string): number | null {
  const raw = localStorage.getItem(key)
  if (raw == null || raw === '') return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

export function getTenantId(): number | null {
  return readNumeric(TENANT_ID_KEY)
}

export function setTenantId(id: number): void {
  localStorage.setItem(TENANT_ID_KEY, String(id))
}

export function removeTenantId(): void {
  localStorage.removeItem(TENANT_ID_KEY)
}

export function getVisitTenantId(): number | null {
  return readNumeric(VISIT_TENANT_ID_KEY)
}

export function setVisitTenantId(id: number): void {
  localStorage.setItem(VISIT_TENANT_ID_KEY, String(id))
}

export function removeVisitTenantId(): void {
  localStorage.removeItem(VISIT_TENANT_ID_KEY)
}
