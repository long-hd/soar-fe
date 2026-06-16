import { request } from '@/shared/api/http-client'
import type { CommonResult, PageResult } from '@/shared/api/types'
import type {
  RoleAssignDataScopeReqDTO,
  RoleAssignMenuReqDTO,
  RolePageReqParams,
  RoleRespDTO,
  RoleSaveReqDTO,
} from '../types'

const BASE = '/admin-api/system/role'

export const roleApi = {
  page(params: RolePageReqParams): Promise<PageResult<RoleRespDTO>> {
    return request
      .get<CommonResult<PageResult<RoleRespDTO>>>(`${BASE}/page`, { params })
      .then(r => r.data.data)
  },

  get(id: number): Promise<RoleRespDTO> {
    return request
      .get<CommonResult<RoleRespDTO>>(`${BASE}/get`, { params: { id } })
      .then(r => r.data.data)
  },

  create(data: RoleSaveReqDTO): Promise<number> {
    return request.post<CommonResult<number>>(`${BASE}/create`, data).then(r => r.data.data)
  },

  update(data: RoleSaveReqDTO): Promise<boolean> {
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

  simpleList(): Promise<RoleRespDTO[]> {
    return request.get<CommonResult<RoleRespDTO[]>>(`${BASE}/simple-list`).then(r => r.data.data)
  },

  assignDataScope(data: RoleAssignDataScopeReqDTO): Promise<boolean> {
    return request
      .post<CommonResult<boolean>>('/admin-api/system/permission/assign-role-data-scope', data)
      .then(r => r.data.data)
  },

  listRoleMenus(roleId: number): Promise<number[]> {
    return request
      .get<CommonResult<number[]>>('/admin-api/system/permission/list-role-menus', {
        params: { roleId },
      })
      .then(r => r.data.data)
  },

  assignRoleMenu(data: RoleAssignMenuReqDTO): Promise<boolean> {
    return request
      .post<CommonResult<boolean>>('/admin-api/system/permission/assign-role-menu', data)
      .then(r => r.data.data)
  },
}
