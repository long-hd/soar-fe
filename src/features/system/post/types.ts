/**
 * Post module TypeScript types — mirror of BE DTOs:
 *   soar-module-system/.../dept/dto/post/*.java
 */

// ===== Response =====

export interface PostRespDTO {
  id: number
  name: string
  code: string
  sort: number
  status: number
  remark?: string
  createTime: string
}

// ===== Request — Create + Update (unified) =====

export interface PostSaveReqDTO {
  id?: number
  name: string
  code: string
  sort: number
  status: number
  remark?: string
}

// ===== Search filters =====

export interface PostFilters extends Record<string, unknown> {
  code?: string
  name?: string
  status?: number
}

export type PostPageReqParams = {
  pageNo: number
  pageSize: number
} & PostFilters
