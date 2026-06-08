import type { AuthTokensDTO } from '@/shared/api/types'

/**
 * Auth domain types — request/response DTOs mirroring BE source of truth.
 * BE files (canonical):
 * - AuthLoginReqDTO.java
 * - AuthLoginRespDTO.java (we alias to AuthTokensDTO since shape is identical)
 * - AuthPermissionInfoRespDTO.java (+ inner UserDTO, MenuDTO)
 * - TenantSimpleRespDTO.java
 */

// ===== Request DTOs =====

export interface AuthLoginReqDTO {
  username: string
  password: string
  /**
   * Captcha verification payload. Optional unless BE has `captcha.enable=true`,
   * in which case it becomes required via validation group `CodeEnableGroup`.
   * Skips captcha UI for now; this stays optional in the type.
   */
  captchaVerification?: string

  // Social-login fields, kept for forward compat
  socialType?: number
  socialCode?: string
  socialState?: string
}

// ===== Response DTOs =====

/** Same shape as `/auth/refresh-token` response. Aliased from shared cross-cutting type. */
export type AuthLoginRespDTO = AuthTokensDTO

export interface UserDTO {
  id: number
  nickname: string
  avatar: string
  deptId: number
  username: string
  email?: string
}

/**
 * Menu tree node from BE. Phase 5A consumes:
 * - `tabKey` for URL `?tab=` dispatcher key
 * - `component` for `import.meta.glob` file path lookup
 * - `name`, `icon`, `parentId`, `visible`, `children` for sidebar render
 *
 * Fields `path` and `componentName` are deprecated in V1_0_8 — BE still emits
 * them for transition compat. Soar FE ignores them.
 */
export interface MenuDTO {
  id: number
  parentId: number
  name: string
  tabKey?: string
  /** @deprecated removed in a future BE migration; do not consume */
  path?: string
  component?: string
  /** @deprecated removed in a future BE migration; do not consume */
  componentName?: string
  icon?: string
  visible: boolean
  keepAlive: boolean
  alwaysShow?: boolean
  children?: MenuDTO[]
}

export interface AuthPermissionInfoRespDTO {
  user: UserDTO
  roles: string[] // BE Set<String> → JSON array
  permissions: string[]
  menus: MenuDTO[]
}

// ===== Tenant DTOs =====

export interface TenantSimpleRespDTO {
  id: number
  name: string
}
