import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { fileConfigApi } from '@/features/infra/file-config/api'
import type { FileConfigSaveReqDTO } from '@/features/infra/file-config/types'

export const fileConfigQueryKey = ['infra', 'file-config'] as const

export const fileConfigKey = {
  all: fileConfigQueryKey,
  detail: (id: number) => [...fileConfigQueryKey, 'detail', id] as const,
}

export function useFileConfigDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fileConfigKey.detail(id!),
    queryFn: () => fileConfigApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function useFileConfigMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: fileConfigQueryKey })

  const create = useMutation({
    mutationFn: (data: FileConfigSaveReqDTO) => fileConfigApi.create(data),
    onSuccess: () => {
      message.success(t('infraFileConfig.messages.createSuccess'))
      void invalidateList()
    },
  })

  const update = useMutation({
    mutationFn: (data: FileConfigSaveReqDTO) => fileConfigApi.update(data),
    onSuccess: () => {
      message.success(t('infraFileConfig.messages.updateSuccess'))
      void invalidateList()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => fileConfigApi.delete(id),
    onSuccess: () => {
      message.success(t('infraFileConfig.messages.deleteSuccess'))
      void invalidateList()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => fileConfigApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('infraFileConfig.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateList()
    },
  })

  const updateMaster = useMutation({
    mutationFn: (id: number) => fileConfigApi.updateMaster(id),
    onSuccess: () => {
      message.success(t('infraFileConfig.messages.setMasterSuccess'))
      void invalidateList()
    },
  })

  return { create, update, remove, removeMany, updateMaster }
}
