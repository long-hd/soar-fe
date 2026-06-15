import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { DEPT_QUERY_KEY } from '@/shared/hooks/use-dept-tree'

import { deptApi } from '../api'
import type { DeptFilters, DeptSaveReqDTO } from '../types'

export const DEPT_ADMIN_QUERY_KEY = ['system', 'dept'] as const

export const sysDeptQueryKey = {
  all: DEPT_ADMIN_QUERY_KEY,
  detail: (id: number) => [...sysDeptQueryKey.all, 'detail', id] as const,
  list: (filters: DeptFilters) => [...sysDeptQueryKey.all, 'list', filters] as const,
  fullList: [...DEPT_ADMIN_QUERY_KEY, 'full-list'] as const,
}

export function useDeptListQuery(
  filters: DeptFilters,
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: sysDeptQueryKey.list(filters),
    queryFn: () => deptApi.list(filters),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60_000,
  })
}

/**
 * Fetches the full unfiltered dept list. Dedicated key separate from `list({})`
 * to avoid options collision with the page's filtered query — modal needs
 * fresh data on edit-open with shorter staleTime than the page's list query.
 *
 * Used by DeptFormModal to compute disabledIds (self + descendants) for parent picker.
 */
export function useDeptFullListQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysDeptQueryKey.fullList,
    queryFn: () => deptApi.list({}),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  })
}

export function useDeptDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysDeptQueryKey.detail(id!),
    queryFn: () => deptApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function useDeptMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: DEPT_ADMIN_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: DEPT_QUERY_KEY })
  }

  const create = useMutation({
    mutationFn: (data: DeptSaveReqDTO) => deptApi.create(data),
    onSuccess: () => {
      message.success(t('systemDept.messages.createSuccess'))
      void invalidateAll()
    },
  })

  const update = useMutation({
    mutationFn: (data: DeptSaveReqDTO) => deptApi.update(data),
    onSuccess: () => {
      message.success(t('systemDept.messages.updateSuccess'))
      void invalidateAll()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => deptApi.delete(id),
    onSuccess: () => {
      message.success(t('systemDept.messages.deleteSuccess'))
      void invalidateAll()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => deptApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('systemDept.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateAll()
    },
  })

  return { create, update, remove, removeMany }
}
