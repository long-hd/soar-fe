import type { TreeNode } from '@/shared/lib/tree'

export interface DeptRespDTO {
  id: number
  name: string
  parentId: number
  sort: number
  status: number
  leaderUserId?: number
  phone?: string
  email?: string
  createTime: string
}

export interface DeptSaveReqDTO {
  id?: number
  name: string
  parentId?: number
  sort: number
  status: number
  leaderUserId?: number
  phone?: string
  email?: string
}

export interface DeptFilters extends Record<string, unknown> {
  name?: string
  status?: number
}

export type DeptTreeNode = TreeNode<DeptRespDTO>
