import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type { DictDataPageReqParams, DictDataRespDTO, DictDataSaveReqDTO } from '../types'

const BASE = '/admin-api/system/dict-data'

export const dictDataApi = {
  page(params: DictDataPageReqParams): Promise<PageResult<DictDataRespDTO>> {
    return request
      .get<CommonResult<PageResult<DictDataRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<DictDataRespDTO> {
    return request
      .get<CommonResult<DictDataRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: DictDataSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: DictDataSaveReqDTO): Promise<boolean> {
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
