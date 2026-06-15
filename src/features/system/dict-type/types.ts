/**
 * DictType module TypeScript types — mirror of BE DTOs:
 *   soar-module-system/.../dict/dto/type/*.java
 */

export interface DictTypeRespDTO {
  id: number
  name: string
  type: string
  status: number
  remark?: string
  createTime: string
}

export interface DictTypeSaveReqDTO {
  id?: number
  name: string
  type: string
  status: number
  remark?: string
}

export interface DictTypeFilters extends Record<string, unknown> {
  name?: string
  type?: string
  status?: number
  createTime?: [string, string]
}

export type DictTypePageReqParams = {
  pageNo: number
  pageSize: number
} & DictTypeFilters
