import { userApi } from '@/features/system/user/api'
import type {
  UserSaveReqDTO,
  UserUpdatePasswordReqDTO,
  UserUpdateStatusReqDTO,
} from '@/features/system/user/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

export const USER_QUERY_KEY = ['system', 'user'] as const

export const sysUserQueryKey = {
  all: USER_QUERY_KEY,
  detail: (id: number) => [...sysUserQueryKey.all, 'detail', id] as const,
}

// ===== Queries =====

export function useUserDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysUserQueryKey.detail(id!),
    queryFn: () => userApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

// ===== Mutations (collected — page destructures what it needs) =====

export function useUserMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY })

  const create = useMutation({
    mutationFn: (data: UserSaveReqDTO) => userApi.create(data),
    onSuccess: () => {
      message.success(t('systemUser.messages.createSuccess'))
      void invalidateList()
    },
  })

  const update = useMutation({
    mutationFn: (data: UserSaveReqDTO) => userApi.update(data),
    onSuccess: () => {
      message.success(t('systemUser.messages.updateSuccess'))
      void invalidateList()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      message.success(t('systemUser.messages.deleteSuccess'))
      void invalidateList()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => userApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('systemUser.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateList()
    },
  })

  const updateStatus = useMutation({
    mutationFn: (vars: UserUpdateStatusReqDTO) => userApi.updateStatus(vars),
    onSuccess: () => {
      message.success(t('systemUser.messages.statusUpdateSuccess'))
      void invalidateList()
    },
  })

  const updatePassword = useMutation({
    mutationFn: (vars: UserUpdatePasswordReqDTO) => userApi.updatePassword(vars),
    onSuccess: () => {
      message.success(t('systemUser.messages.resetPasswordSuccess'))
      // No invalidation — password isn't a visible column
    },
  })

  return { create, update, remove, removeMany, updateStatus, updatePassword }
}
