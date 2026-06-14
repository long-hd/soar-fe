import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type {
  UserPageReqParams,
  UserRespDTO,
  UserSaveReqDTO,
  UserUpdatePasswordReqDTO,
  UserUpdateStatusReqDTO,
} from '../types'

/**
 * User CRUD API client.
 *
 * Phase 5A HTTP convention (§3.4):
 *  - Methods unwrap `CommonResult` and return domain DTO directly.
 *  - Callers never see `.data.data`.
 *  - `code !== 0` is handled by the global error-interceptor — methods don't
 *    inspect `code`; if axios resolves, BE returned `code === 0` (success).
 *
 * Array params (`/delete-list?ids=1&ids=2`) work via `request`'s qs serializer
 * with `arrayFormat: 'repeat'` (configured in http-client.ts).
 */

const BASE = '/admin-api/system/user'
const PERMISSION_BASE = '/admin-api/system/permission'

export const userApi = {
  page(params: UserPageReqParams): Promise<PageResult<UserRespDTO>> {
    return request
      .get<CommonResult<PageResult<UserRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<UserRespDTO> {
    return request
      .get<CommonResult<UserRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  /** Returns the new user's id. */
  create(data: UserSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: UserSaveReqDTO): Promise<boolean> {
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

  updatePassword(data: UserUpdatePasswordReqDTO): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${BASE}/update-password`, data)
      .then(r => r.data.data)
  },

  updateStatus(data: UserUpdateStatusReqDTO): Promise<boolean> {
    return request.put<CommonResult<boolean>>(`${BASE}/update-status`, data).then(r => r.data.data)
  },

  getUserRoleIds(userId: number): Promise<number[]> {
    return request
      .get<CommonResult<number[]>>(`${PERMISSION_BASE}/list-user-roles`, {
        params: { userId },
      })
      .then(r => r.data.data)
  },

  assignRoles(data: { userId: number; roleIds: number[] }): Promise<boolean> {
    return request
      .put<CommonResult<boolean>>(`${PERMISSION_BASE}/assign-user-role`, data)
      .then(r => r.data.data)
  },
}
