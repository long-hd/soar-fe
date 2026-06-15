import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { dictDataApi } from '@/features/system/dict-data/api'
import type { DictDataSaveReqDTO } from '@/features/system/dict-data/types'
import { DICT_QUERY_KEY } from '@/shared/hooks/use-dict-data'

export const DICT_DATA_QUERY_KEY = ['system', 'dict-data', 'page'] as const

export const sysDictDataQueryKey = {
  all: DICT_DATA_QUERY_KEY,
  detail: (id: number) => [...sysDictDataQueryKey.all, 'detail', id] as const,
}

export function useDictDataDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysDictDataQueryKey.detail(id!),
    queryFn: () => dictDataApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function useDictDataMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['system', 'dict-data'] })
    void queryClient.invalidateQueries({ queryKey: DICT_QUERY_KEY })
  }

  const create = useMutation({
    mutationFn: (data: DictDataSaveReqDTO) => dictDataApi.create(data),
    onSuccess: () => {
      message.success(t('systemDictData.messages.createSuccess'))
      invalidateAll()
    },
  })

  const update = useMutation({
    mutationFn: (data: DictDataSaveReqDTO) => dictDataApi.update(data),
    onSuccess: () => {
      message.success(t('systemDictData.messages.updateSuccess'))
      invalidateAll()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => dictDataApi.delete(id),
    onSuccess: () => {
      message.success(t('systemDictData.messages.deleteSuccess'))
      invalidateAll()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => dictDataApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('systemDictData.messages.deleteBulkSuccess', { count: ids.length }))
      invalidateAll()
    },
  })

  return { create, update, remove, removeMany }
}
