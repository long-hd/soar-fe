import { bootstrapAuth } from '@/app/slices/auth-slice'
import { useAppDispatch } from '@/app/store'
import { authApi } from '@/features/auth/api/auth-api'
import TenantErrorPage from '@/pages/error/tenant-error'
import { getTenantId, setTenantId } from '@/shared/lib/tenant'
import { getAccessToken } from '@/shared/lib/token'
import { Spin } from 'antd'
import { useEffect, useRef, useState, type ReactNode } from 'react'

type Status = 'pending' | 'resolved' | 'failed'

interface TenantBootGateProps {
  children: ReactNode
}

/**
 * Boot-time gate: ensures `tenantId` is resolved (and persisted to localStorage)
 * before any feature code makes API calls.
 *
 * Flow:
 *  1. If storage already has `SOAR_TENANT_ID`, skip resolution.
 *  2. Else, call GET /tenant/get-by-website?website=<location.host>.
 *     - On success (id returned): persist + proceed.
 *     - On null (no match): show TenantErrorPage — blocks app.
 *     - On network error: show TenantErrorPage — user can retry via reload.
 *  3. After tenant resolved, if access token also in storage, dispatch
 *     `bootstrapAuth()` to refresh permissions/menus from BE (handles
 *     cross-tab session continuation + permission revocation).
 *
 * Mounted between AntdThemeBridge and children in providers.tsx — needs
 * antd ConfigProvider context (for Spin + TenantErrorPage) and Redux context
 * (for dispatch).
 *
 * Note: stale tenant ID in storage (e.g., BE deleted that tenant) is NOT
 * re-validated here — first API call will fail and surface the issue.
 * Trade-off accepted: avoid an extra request on every page load.
 */
export default function TenantBootGate({ children }: TenantBootGateProps) {
  const dispatch = useAppDispatch()

  // Initialize status synchronously — if tenant already in storage, skip the
  // spinner flash by going straight to 'resolved'.
  const [status, setStatus] = useState<Status>(() =>
    getTenantId() != null ? 'resolved' : 'pending',
  )

  // React 19 strict-mode double-invokes effects in dev. Ref guard prevents
  // duplicate API call.
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function bootstrap() {
      // Step 1: ensure tenant resolved
      if (getTenantId() == null) {
        try {
          const tenant = await authApi.getTenantByWebsite(window.location.host)
          if (tenant == null) {
            setStatus('failed')
            return
          }
          setTenantId(tenant.id)
        } catch {
          // Network error, BE down, etc.
          setStatus('failed')
          return
        }
      }
      setStatus('resolved')

      // Step 2: if token exists in storage, refresh permission info.
      // Don't await — let app render while bootstrapAuth runs in background.
      if (getAccessToken()) {
        dispatch(bootstrapAuth())
      }
    }

    void bootstrap()
  }, [dispatch])

  if (status === 'pending') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  if (status === 'failed') {
    return <TenantErrorPage />
  }

  return <>{children}</>
}
