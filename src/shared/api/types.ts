/**
 * Common API response/request shapes shared across all features.
 * BE source of truth: `soar-be/soar-framework/soar-spring-boot-starter-common`
 * — `CommonResult.java` and `PageResult.java`.
 */

/** BE wraps every response. `code === 0` means success. */
export interface CommonResult<T> {
  code: number
  data: T
  msg: string
}

/** BE pagination envelope. */
export interface PageResult<T> {
  list: T[]
  total: number
}

/** BE pagination request params — extend per-feature for filters/sort. */
export interface PageParam {
  pageNo: number
  pageSize: number
}

/**
 * Auth token shape — cross-cutting because both `auth-interceptor.ts`
 * (in `shared/api/interceptors/`) and `features/auth/` need it.
 *
 * Lives in shared/api/types instead of features/auth/types because
 * AGENTS import-direction rule: shared/ MUST NOT import from features/.
 *
 * Returned by both `/auth/login` and `/auth/refresh-token`.
 */
export interface AuthTokensDTO {
  userId: number
  accessToken: string
  refreshToken: string
  expiresTime: string // ISO-8601 — informational only; not used for client-side expiry
}
