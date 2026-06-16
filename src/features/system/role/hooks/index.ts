import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { roleApi } from '@/features/system/role/api'
import type {
  RoleAssignDataScopeReqDTO,
  RoleAssignMenuReqDTO,
  RoleSaveReqDTO,
} from '@/features/system/role/types'

export const ROLE_QUERY_KEY = ['system', 'role'] as const

export const sysRoleQueryKey = {
  all: ROLE_QUERY_KEY,
  detail: (id: number) => [...sysRoleQueryKey.all, 'detail', id] as const,
  simpleList: [...ROLE_QUERY_KEY, 'simple-list'] as const,
}

export function useRoleSimpleList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysRoleQueryKey.simpleList,
    queryFn: () => roleApi.simpleList(),
    enabled: options?.enabled ?? true,
  })
}

export function useRoleDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysRoleQueryKey.detail(id!),
    queryFn: () => roleApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function roleMenuIdsQueryKey(roleId: number) {
  return [...sysRoleQueryKey.all, 'menu-ids', roleId] as const
}

export function useRoleMenuIdsQuery(roleId: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roleMenuIdsQueryKey(roleId!),
    queryFn: () => roleApi.listRoleMenus(roleId!),
    enabled: roleId != null && (options?.enabled ?? true),
  })
}

export function useRoleMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEY })

  const create = useMutation({
    mutationFn: (data: RoleSaveReqDTO) => roleApi.create(data),
    onSuccess: () => {
      message.success(t('systemRole.messages.createSuccess'))
      void invalidateList()
    },
  })

  const update = useMutation({
    mutationFn: (data: RoleSaveReqDTO) => roleApi.update(data),
    onSuccess: () => {
      message.success(t('systemRole.messages.updateSuccess'))
      void invalidateList()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => roleApi.delete(id),
    onSuccess: () => {
      message.success(t('systemRole.messages.deleteSuccess'))
      void invalidateList()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => roleApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('systemRole.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateList()
    },
  })

  const assignDataScope = useMutation({
    mutationFn: (data: RoleAssignDataScopeReqDTO) => roleApi.assignDataScope(data),
    onSuccess: () => {
      message.success(t('systemRole.dataScope.messages.assignSuccess'))
      void invalidateList()
    },
  })

  const assignRoleMenu = useMutation({
    mutationFn: (data: RoleAssignMenuReqDTO) => roleApi.assignRoleMenu(data),
    onSuccess: () => {
      message.success(t('systemRole.menuAssignment.messages.success'))
      void invalidateList()
    },
  })

  return { create, update, remove, removeMany, assignDataScope, assignRoleMenu }
}
