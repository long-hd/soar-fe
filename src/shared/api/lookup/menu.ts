import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * BE source: MenuController.getSimpleMenuList — enabled menus only (server-filtered).
 */

export interface MenuSimpleDTO {
  id: number
  name: string
  parentId: number
  /** 1=Directory, 2=Menu, 3=Button — see BE MenuTypeEnum */
  type: number
}

const URL = '/admin-api/system/menu/simple-list'

export async function fetchMenuList(): Promise<MenuSimpleDTO[]> {
  const res = await request.get<CommonResult<MenuSimpleDTO[]>>(URL)
  return res.data.data
}
