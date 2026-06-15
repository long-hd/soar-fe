import type { TreeNode } from '@/shared/lib/tree'

export interface MenuRespDTO {
  id: number
  name: string
  type: number
  sort: number
  parentId: number
  status: number
  createTime: string
  tabKey?: string
  permission?: string
  path?: string
  icon?: string
  component?: string
  componentName?: string
  visible?: boolean
  keepAlive?: boolean
  alwaysShow?: boolean
}

export interface MenuSaveReqDTO {
  id?: number
  name: string
  type: number
  sort: number
  parentId: number
  status: number
  tabKey?: string
  permission?: string
  path?: string
  icon?: string
  component?: string
  componentName?: string
  visible?: boolean
  keepAlive?: boolean
  alwaysShow?: boolean
}

export interface MenuFilters extends Record<string, unknown> {
  name?: string
  status?: number
}

export type MenuTreeNode = TreeNode<MenuRespDTO>
