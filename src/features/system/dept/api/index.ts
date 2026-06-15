import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

import type { DeptFilters, DeptRespDTO, DeptSaveReqDTO } from '../types'

const BASE = '/admin-api/system/dept'

export const deptApi = {
  list(params: DeptFilters): Promise<DeptRespDTO[]> {
    return request
      .get<CommonResult<DeptRespDTO[]>>(`${BASE}/list`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<DeptRespDTO> {
    return request
      .get<CommonResult<DeptRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: DeptSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: DeptSaveReqDTO): Promise<boolean> {
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
