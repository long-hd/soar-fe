import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type { FileConfigPageReqParams, FileConfigRespDTO, FileConfigSaveReqDTO } from '../types'

const BASE = '/admin-api/infra/file-config'

export const fileConfigApi = {
  page(params: FileConfigPageReqParams): Promise<PageResult<FileConfigRespDTO>> {
    return request
      .get<CommonResult<PageResult<FileConfigRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<FileConfigRespDTO> {
    return request
      .get<CommonResult<FileConfigRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: FileConfigSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: FileConfigSaveReqDTO): Promise<boolean> {
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

  updateMaster(id: number): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${BASE}/update-master`, null, { params: { id } })
      .then(r => r.data.data)
  },

  test(id: number): Promise<string> {
    return request
      .get<CommonResult<string>>(`${BASE}/test`, { params: { id } })
      .then(r => r.data.data)
  },
}
