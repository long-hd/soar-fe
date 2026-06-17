/**
 * File module TypeScript types — mirror of BE DTOs:
 *   soar-module-infra/.../file/dto/file/*.java
 */

import type { PageParam } from '@/shared/api/types'

// ===== Response =====

export interface FileRespDTO {
  id: number
  configId: number
  name: string
  path: string
  url: string
  type: string
  size: number
  createTime: string
}

// ===== Search filters =====

export interface FileFilters extends Record<string, unknown> {
  name?: string
  type?: string
  createTime?: [string, string]
}

export type FilePageReqParams = PageParam & FileFilters

// ===== Upload =====

export interface UploadProgress {
  loaded: number
  total: number
}
