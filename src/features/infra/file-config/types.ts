/**
 * File Config module TypeScript types — mirror of BE DTOs:
 *   soar-module-infra/.../file/dto/config/*.java
 */

import type { PageParam } from '@/shared/api/types'

// ===== Storage-specific config shapes (matches BE FileClientConfig variants) =====

export interface DBFileClientConfig {
  domain?: string
}

export interface LocalFileClientConfig {
  basePath: string
  domain?: string
}

export interface S3FileClientConfig {
  endpoint: string
  bucket: string
  accessKey: string
  accessSecret: string
  enablePathStyleAccess: boolean
  enablePublicAccess: boolean
  region?: string
  domain?: string
}

/** Union — discriminated by `storage` field on the parent DTO. */
export type FileClientConfig = DBFileClientConfig | LocalFileClientConfig | S3FileClientConfig

// ===== Response =====

export interface FileConfigRespDTO {
  id: number
  name: string
  storage: number
  master: boolean
  config: Record<string, unknown>
  remark?: string
  createTime: string
}

// ===== Request — Create + Update (unified) =====

export interface FileConfigSaveReqDTO {
  id?: number
  name: string
  storage: number
  config: Record<string, unknown>
  remark?: string
}

// ===== Search filters =====

export interface FileConfigFilters extends Record<string, unknown> {
  name?: string
  storage?: number
  createTime?: [string, string]
}

export type FileConfigPageReqParams = PageParam & FileConfigFilters
