import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

import type { MenuFilters, MenuRespDTO, MenuSaveReqDTO } from '../types'

const BASE = '/admin-api/system/menu'

export const menuApi = {
  list(params: MenuFilters): Promise<MenuRespDTO[]> {
    return request
      .get<CommonResult<MenuRespDTO[]>>(`${BASE}/list`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<MenuRespDTO> {
    return request
      .get<CommonResult<MenuRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: MenuSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: MenuSaveReqDTO): Promise<boolean> {
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
