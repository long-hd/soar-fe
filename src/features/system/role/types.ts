/**
 * Role module TypeScript types — mirror of BE DTOs:
 *   soar-module-system/.../permission/dto/role/*.java
 */

// ===== Response =====

export interface RoleRespDTO {
  id: number
  name: string
  code: string
  sort: number
  status: number
  type: number
  remark?: string
  dataScope: number
  dataScopeDeptIds?: number[]
  createTime: string
}

// ===== Request — Create + Update (unified) =====

export interface RoleSaveReqDTO {
  id?: number
  name: string
  code: string
  sort: number
  status: number
  remark?: string
}

// ===== Request — Assign data scope =====

export interface RoleAssignDataScopeReqDTO {
  roleId: number
  dataScope: number
  dataScopeDeptIds?: number[] | null
}

// ===== Search filters =====

export interface RoleFilters extends Record<string, unknown> {
  name?: string
  code?: string
  status?: number
  createTime?: [string, string]
}

export type RolePageReqParams = {
  pageNo: number
  pageSize: number
} & RoleFilters
