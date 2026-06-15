import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type { DictTypePageReqParams, DictTypeRespDTO, DictTypeSaveReqDTO } from '../types'

const BASE = '/admin-api/system/dict-type'

export const dictTypeApi = {
  page(params: DictTypePageReqParams): Promise<PageResult<DictTypeRespDTO>> {
    return request
      .get<CommonResult<PageResult<DictTypeRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<DictTypeRespDTO> {
    return request
      .get<CommonResult<DictTypeRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: DictTypeSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: DictTypeSaveReqDTO): Promise<boolean> {
    return request.put<CommonResult<boolean>>(`${BASE}/update`, data).then(r => r.data.data)
  },

  delete(id: number): Promise<boolean> {
    return request
      .delete<CommonResult<boolean>>(`${BASE}/delete`, { params: { id } })
      .then(r => r.data.data)
  },

  deleteList(ids: number[]): Promise<boolean> {
    return request
      .delete<CommonResult<boolean>>(`${BASE}/delete-list`, { params: { ids } })
      .then(r => r.data.data)
  },
}
