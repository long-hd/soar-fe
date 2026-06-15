import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { dictTypeApi } from '@/features/system/dict-type/api'
import type { DictTypeSaveReqDTO } from '@/features/system/dict-type/types'

export const DICT_TYPE_QUERY_KEY = ['system', 'dict-type', 'page'] as const

export const sysDictTypeQueryKey = {
  all: DICT_TYPE_QUERY_KEY,
  detail: (id: number) => [...sysDictTypeQueryKey.all, 'detail', id] as const,
}

export function useDictTypeDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysDictTypeQueryKey.detail(id!),
    queryFn: () => dictTypeApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function useDictTypeMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['system', 'dict-type'] })

  const create = useMutation({
    mutationFn: (data: DictTypeSaveReqDTO) => dictTypeApi.create(data),
    onSuccess: () => {
      message.success(t('systemDictType.messages.createSuccess'))
      void invalidateAll()
    },
  })

  const update = useMutation({
    mutationFn: (data: DictTypeSaveReqDTO) => dictTypeApi.update(data),
    onSuccess: () => {
      message.success(t('systemDictType.messages.updateSuccess'))
      void invalidateAll()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => dictTypeApi.delete(id),
    onSuccess: () => {
      message.success(t('systemDictType.messages.deleteSuccess'))
      void invalidateAll()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => dictTypeApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('systemDictType.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateAll()
    },
  })

  return { create, update, remove, removeMany }
}
