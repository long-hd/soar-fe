import type {
  AuthLoginReqDTO,
  AuthLoginRespDTO,
  AuthPermissionInfoRespDTO,
  TenantSimpleRespDTO,
} from '@/features/auth/types'
import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

const URL_PREFIX = '/admin-api/system'

/**
 * Auth feature API.
 *
 * `refreshToken` is intentionally NOT exposed here — refresh is an internal
 * concern of `shared/api/interceptors/auth-interceptor.ts` (called via the
 * dedicated `refreshClient` to avoid interceptor recursion). Feature code
 * should never need to trigger refresh manually.
 *
 * Pattern: caller code does `.data.data` to unwrap CommonResult — interceptor
 * does NOT unwrap. Each function declares its unwrapped
 * return type and performs the unwrap as the last expression.
 */
export const authApi = {
  /** POST /auth/login — exchanges credentials for tokens. */
  async login(req: AuthLoginReqDTO): Promise<AuthLoginRespDTO> {
    const res = await request.post<CommonResult<AuthLoginRespDTO>>(`${URL_PREFIX}/auth/login`, req)
    return res.data.data
  },

  /**
   * POST /auth/logout — invalidates the current access token on BE.
   * Best-effort: caller should not block client-side logout on this resolving.
   */
  async logout(): Promise<boolean> {
    const res = await request.post<CommonResult<boolean>>(`${URL_PREFIX}/auth/logout`)
    return res.data.data
  },

  /**
   * GET /auth/get-permission-info — fetches user + roles + permissions + menus
   * for the currently authenticated user. Call after login + on app boot
   * (when a token is already present in storage).
   */
  async getPermissionInfo(): Promise<AuthPermissionInfoRespDTO> {
    const res = await request.get<CommonResult<AuthPermissionInfoRespDTO>>(
      `${URL_PREFIX}/auth/get-permission-info`,
    )
    return res.data.data
  },

  /**
   * GET /tenant/get-by-website — resolves the tenant for a given hostname.
   * Public endpoint (@PermitAll + @TenantIgnore on BE) — no token, no tenant-id
   * header required. Returns `null` when no tenant matches the host.
   */
  async getTenantByWebsite(website: string): Promise<TenantSimpleRespDTO | null> {
    const res = await request.get<CommonResult<TenantSimpleRespDTO | null>>(
      `${URL_PREFIX}/tenant/get-by-website`,
      { params: { website } },
    )
    return res.data.data
  },

  /**
   * GET /tenant/get-id-by-name — looks up tenant ID by name.
   * Public endpoint. Used as fallback when `getTenantByWebsite` returns null
   * and the user enters tenant name manually.
   * BE throws business exception (non-zero code) when name not found —
   * error-interceptor toasts the msg, caller's promise rejects.
   */
  async getTenantIdByName(name: string): Promise<number> {
    const res = await request.get<CommonResult<number>>(`${URL_PREFIX}/tenant/get-id-by-name`, {
      params: { name },
    })
    return res.data.data
  },
}
