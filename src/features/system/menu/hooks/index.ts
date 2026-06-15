import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { bootstrapAuth } from '@/app/slices/auth-slice'
import { useAppDispatch } from '@/app/store'
import { MENU_QUERY_KEY } from '@/shared/hooks/use-menu-tree'

import { menuApi } from '../api'
import type { MenuFilters, MenuSaveReqDTO } from '../types'

export const MENU_ADMIN_QUERY_KEY = ['system', 'menu'] as const

export const sysMenuQueryKey = {
  all: MENU_ADMIN_QUERY_KEY,
  detail: (id: number) => [...sysMenuQueryKey.all, 'detail', id] as const,
  list: (filters: MenuFilters) => [...sysMenuQueryKey.all, 'list', filters] as const,
  fullList: [...MENU_ADMIN_QUERY_KEY, 'full-list'] as const,
}

export function useMenuListQuery(
  filters: MenuFilters,
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: sysMenuQueryKey.list(filters),
    queryFn: () => menuApi.list(filters),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60_000,
  })
}

/**
 * Full unfiltered menu list for parent-picker disabledIds and tabKey uniqueness checks.
 * Separate key from filtered page list — see dept `useDeptFullListQuery` pattern.
 */
export function useMenuFullListQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysMenuQueryKey.fullList,
    queryFn: () => menuApi.list({}),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  })
}

export function useMenuDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysMenuQueryKey.detail(id!),
    queryFn: () => menuApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function useMenuMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: MENU_ADMIN_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY })
  }

  const create = useMutation({
    mutationFn: (data: MenuSaveReqDTO) => menuApi.create(data),
    onSuccess: () => {
      message.success(t('systemMenu.messages.createSuccess'))
      invalidateAll()
      void dispatch(bootstrapAuth())
    },
  })

  const update = useMutation({
    mutationFn: (data: MenuSaveReqDTO) => menuApi.update(data),
    onSuccess: () => {
      message.success(t('systemMenu.messages.updateSuccess'))
      invalidateAll()
      void dispatch(bootstrapAuth())
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => menuApi.delete(id),
    onSuccess: () => {
      message.success(t('systemMenu.messages.deleteSuccess'))
      invalidateAll()
      void dispatch(bootstrapAuth())
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => menuApi.deleteList(ids),
    onSuccess: (_data, ids) => {
      message.success(t('systemMenu.messages.deleteBulkSuccess', { count: ids.length }))
      invalidateAll()
      void dispatch(bootstrapAuth())
    },
  })

  return { create, update, remove, removeMany }
}
