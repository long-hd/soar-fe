import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * BE source: UserController.getSimpleUserList — returns ENABLE users only (server-filtered).
 */

export interface UserSimpleDTO {
  id: number
  nickname: string
  deptId?: number
  deptName?: string
}

const URL = '/admin-api/system/user/simple-list'

export async function fetchUserSimpleList(): Promise<UserSimpleDTO[]> {
  const res = await request.get<CommonResult<UserSimpleDTO[]>>(URL)
  return res.data.data
}
