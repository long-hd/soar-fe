import type { AuthTokensDTO, CommonResult } from '@/shared/api/types'
import { env } from '@/shared/lib/env'
import { getTenantId } from '@/shared/lib/tenant'
import type { AxiosError } from 'axios'
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { formatToken, getRefreshToken, setTokens } from '@/shared/lib/token'
import { request } from '@/shared/api/http-client'
import { antdApp } from '@/shared/lib/antd-app-ref'

/**
 * Single-flight token refresh + session-expired handler.
 *
 * IMPORTANT: BE returns HTTP 200 with errors encoded in body. Auth failures
 * arrive as `response.data.code === 401`, not HTTP status 401.
 *
 * Pattern from legacy `service.ts:152-194` (refresh) and `service.ts:245-269`
 * (handleAuthorized). Adapted:
 * - Dedicated `axios.create()` instance for refresh call (legacy mutates global default).
 * - `_isRetry` flag prevents infinite loop if BE keeps returning 401 after refresh.
 * - Stub logout (tech debt #1) — replaced with dispatch(logout()) after B2.
 */

// ===== Module-level state (singleton across the app) =====
let isRefreshing = false
let requestQueue: Array<(newAccessToken: string) => void> = []
let isShowingAuthModal = false

// ===== Refresh client — bypasses our interceptors to avoid recursion =====
const refreshClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
})

async function callRefresh(refreshToken: string): Promise<AuthTokensDTO> {
  const tenantId = getTenantId()
  const headers: Record<string, string> = {}
  if (tenantId != null) headers['tenant-id'] = String(tenantId)

  const { data } = await refreshClient.post<CommonResult<AuthTokensDTO>>(
    '/admin-api/system/auth/refresh-token',
    null,
    { params: { refreshToken }, headers },
  )
  if (data.code !== 0) {
    throw new Error(data.msg || 'Refresh failed')
  }
  return data.data
}

function handleAuthorized(): Promise<never> {
  // Singleton: many concurrent 401s should show only ONE modal
  if (isShowingAuthModal) {
    return Promise.reject(new Error('Session expired'))
  }
  isShowingAuthModal = true

  antdApp.modal.confirm({
    title: 'Session expired',
    content: 'Your session has expired. Please log in again.',
    okText: 'Log in',
    cancelText: 'Cancel',
    onOk: async () => {
      // Dynamic imports break the module-init circular dependency chain:
      //   store → slices/auth-slice → features/auth/api → shared/api/http-client
      //     → shared/api/interceptors/auth-interceptor (this file) -> store (again)
      // Top-level static imports would deadlock module init.
      //
      // At Modal-click runtime, all modules are fully evaluated → dynamic
      // import resolves synchronously from the module graph cache.
      const { store } = await import('@/app/store')
      const { logout } = await import('@/app/slices/auth-slice')
      await store.dispatch(logout())
      // No window.location reload — main.tsx conditional render reacts to
      // isAuthed=false and shows LoginPage. Tenant survives.
    },
    afterClose: () => {
      isShowingAuthModal = false
    },
  })

  return Promise.reject(new Error('Session expired'))
}

/**
 * Response interceptor handling `CommonResult.code === 401`.
 * Returns response unchanged for other codes (delegated to error-interceptor).
 */
export async function authResponseFulfilled(response: AxiosResponse): Promise<AxiosResponse> {
  const body = response.data
  // Non-JSON / binary / unexpected shape — pass through
  if (!body || typeof body !== 'object' || !('code' in body)) {
    return response
  }
  if (body.code !== 401) {
    return response
  }

  // === code === 401 path ===
  const config = response.config as InternalAxiosRequestConfig & { _isRetry?: boolean }

  // Already retried once → don't loop; force re-login
  if (config._isRetry) {
    return handleAuthorized()
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return handleAuthorized()
  }

  if (!isRefreshing) {
    // === First 401 in the burst — perform the refresh ===
    isRefreshing = true
    try {
      const newTokens = await callRefresh(refreshToken)
      setTokens(newTokens)

      // Resume all queued requests with new token
      const queue = requestQueue
      requestQueue = []
      queue.forEach(cb => cb(newTokens.accessToken))

      // Retry the original request with new token via the service instance
      // (so error-interceptor still processes non-401 errors on retry)
      config._isRetry = true
      config.headers.Authorization = formatToken(newTokens.accessToken)
      return await request.request(config)
    } catch {
      // Refresh failed — drain queue (each rejects on its own promise) + force re-login
      requestQueue = []
      return handleAuthorized()
    } finally {
      isRefreshing = false
    }
  }

  // === Already refreshing — queue this request ===
  return new Promise((resolve, reject) => {
    requestQueue.push((newAccessToken: string) => {
      config._isRetry = true
      config.headers.Authorization = formatToken(newAccessToken)
      request.request(config).then(resolve).catch(reject)
    })
  })
}

/** Pass network/HTTP-level errors through; error-interceptor handles them. */
export function authResponseError(error: AxiosError): Promise<never> {
  return Promise.reject(error)
}
