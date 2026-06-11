import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * BE source: DeptController.getSimpleDeptList — returns ENABLE depts only (server-filtered).
 */

export interface DeptSimpleDTO {
  id: number
  name: string
  parentId: number // 0 = root
}

const URL = '/admin-api/system/dept/simple-list'

export async function fetchDeptList(): Promise<DeptSimpleDTO[]> {
  const res = await request.get<CommonResult<DeptSimpleDTO[]>>(URL)
  return res.data.data
}
