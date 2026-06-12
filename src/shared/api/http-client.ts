import { env } from '@/shared/lib/env'
import qs from 'qs'
import axios, { type InternalAxiosRequestConfig } from 'axios'
import { formatToken, getAccessToken } from '@/shared/lib/token'
import { getTenantId, getVisitTenantId } from '@/shared/lib/tenant'
import {
  authResponseError,
  authResponseFulfilled,
} from '@/shared/api/interceptors/auth-interceptor'
import {
  errorResponseError,
  errorResponseFulfilled,
} from '@/shared/api/interceptors/error-interceptor'

/**
 * Paths that must NOT receive `Authorization` header (public endpoints).
 * Login + refresh are obvious; tenant lookup endpoints are `@PermitAll + @TenantIgnore` on BE.
 */
const AUTH_HEADER_WHITELIST = [
  '/admin-api/system/auth/login',
  '/admin-api/system/auth/refresh-token',
  '/admin-api/system/tenant/get-by-website',
  '/admin-api/system/tenant/get-id-by-name',
]

function isAuthWhitelisted(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_HEADER_WHITELIST.some(path => url.includes(path))
}

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    !Array.isArray(value[0])
  )
}
function serializeParams(params: Record<string, unknown>): string {
  const flat: Record<string, unknown> = {}
  const nestedParts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (isObjectArray(value)) {
      // sortingFields, createTime ranges as objects, etc.
      nestedParts.push(
        qs.stringify(
          { [key]: value },
          { allowDots: true, arrayFormat: 'indices', skipNulls: true },
        ),
      )
    } else {
      flat[key] = value
    }
  }
  const flatPart = qs.stringify(flat, {
    allowDots: true,
    arrayFormat: 'repeat', // ids=1&ids=2
    skipNulls: true,
  })
  return [flatPart, ...nestedParts].filter(Boolean).join('&')
}

/**
 * Soar axios instance. Named `request` (not `http`/`api`) so future wrappers can
 * use those names without collision.
 *
 * Pattern from legacy `service.ts:36-46` — adapted: `arrayFormat: 'repeat'` added
 * (legacy uses qs default `'indices'` which produces `ids[0]=1&ids[1]=2`; Spring Boot
 *  `@RequestParam List<T>` expects `ids=1&ids=2`).
 */
export const request = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  paramsSerializer: {
    serialize: serializeParams,
  },
})

// ===== Request interceptor: token + tenant + visit-tenant + GET cache-control =====
// Pattern from legacy service.ts:50-99.
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Authorization header (skip whitelist)
  if (!isAuthWhitelisted(config.url)) {
    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = formatToken(accessToken)
    }
  }

  // tenant-id header (always inject when storage has it; whitelisted endpoints
  // are @TenantIgnore on BE so extra header is harmless)
  const tenantId = getTenantId()
  if (tenantId != null) {
    config.headers['tenant-id'] = String(tenantId)
  }

  // visit-tenant-id only when authenticated (super-admin cross-tenant view)
  if (config.headers.Authorization) {
    const visitTenantId = getVisitTenantId()
    if (visitTenantId != null) {
      config.headers['visit-tenant-id'] = String(visitTenantId)
    }
  }

  // Prevent stale browser cache on GET
  if (config.method?.toUpperCase() === 'GET') {
    config.headers['Cache-Control'] = 'no-cache'
    config.headers['Pragma'] = 'no-cache'
  }

  return config
})

// ===== Response interceptors =====
// Order matters: auth first to catch code === 401 before error-interceptor toasts.
// Axios runs response interceptors in registration (FIFO) order.
request.interceptors.response.use(authResponseFulfilled, authResponseError)
request.interceptors.response.use(errorResponseFulfilled, errorResponseError)
