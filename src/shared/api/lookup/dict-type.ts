import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * BE source: DictTypeController.getSimpleDictTypeList — all types (enabled + disabled).
 * Used for tab title resolution and cross-feature lookups.
 */

export interface DictTypeSimpleDTO {
  id: number
  name: string
  type: string
}

const URL = '/admin-api/system/dict-type/simple-list'

export async function fetchDictTypeList(): Promise<DictTypeSimpleDTO[]> {
  const res = await request.get<CommonResult<DictTypeSimpleDTO[]>>(URL)
  return res.data.data
}
