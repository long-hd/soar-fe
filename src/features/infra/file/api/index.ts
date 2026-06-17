import type { AxiosProgressEvent } from 'axios'

import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'

import type { FilePageReqParams, FileRespDTO, UploadProgress } from '../types'

const BASE = '/admin-api/infra/file'

export const fileApi = {
  page(params: FilePageReqParams): Promise<PageResult<FileRespDTO>> {
    return request
      .get<CommonResult<PageResult<FileRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
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

  /**
   * Mode 1 multipart upload.
   * @returns The uploaded file's access URL (BE returns String, not the full FilePO)
   */
  upload(
    file: File,
    directory?: string,
    onUploadProgress?: (progress: UploadProgress) => void,
  ): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    if (directory) formData.append('directory', directory)
    return request
      .post<CommonResult<string>>(`${BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onUploadProgress
          ? (event: AxiosProgressEvent) => {
              if (event.total) {
                onUploadProgress({ loaded: event.loaded ?? 0, total: event.total })
              }
            }
          : undefined,
      })
      .then(r => r.data.data)
  },
}
