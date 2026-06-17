import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { fileApi } from '@/features/infra/file/api'

export const fileQueryKey = ['infra', 'file'] as const

export const fileKey = {
  all: fileQueryKey,
}

export function useFileMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: fileQueryKey })

  const remove = useMutation({
    mutationFn: (id: number) => fileApi.delete(id),
    onSuccess: () => {
      message.success(t('infraFile.messages.deleteSuccess'))
      void invalidateList()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => fileApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('infraFile.messages.deleteBulkSuccess', { count: ids.length }))
      void invalidateList()
    },
  })

  return { remove, removeMany }
}
