import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * Lookup-style reference data. Cross-cutting (used by every CRUD page),
 * therefore lives in `shared/api/lookup/` rather than a per-feature module.
 *
 * BE source: DictDataController.getSimpleDictDataList (returns ENABLE items only).
 *
 * Note on `value` typing: BE returns `value` as String regardless of the semantic
 * type. Forms that bind to numeric fields (e.g., status: 0|1) work because antd
 * Select and JSON serialization preserve the string through to the request body;
 * Spring's Jackson coerces back to Integer on the BE side. If strict typing
 * becomes a requirement, normalize at the form's `normalize` prop or at the
 * mutation boundary.
 */

export interface DictDataSimpleDTO {
  dictType: string
  value: string
  label: string
  colorType?: string
  cssClass?: string
}

const URL = '/admin-api/system/dict-data/simple-list'

export async function fetchDictDataList(): Promise<DictDataSimpleDTO[]> {
  const res = await request.get<CommonResult<DictDataSimpleDTO[]>>(URL)
  return res.data.data
}
