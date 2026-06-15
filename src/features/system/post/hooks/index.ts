import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'

import { postApi } from '@/features/system/post/api'
import type { PostSaveReqDTO } from '@/features/system/post/types'
import { POST_QUERY_KEY } from '@/shared/hooks/use-post-list'

export const sysPostQueryKey = {
  all: ['system', 'post'] as const,
  detail: (id: number) => [...sysPostQueryKey.all, 'detail', id] as const,
}

export function usePostDetailQuery(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sysPostQueryKey.detail(id!),
    queryFn: () => postApi.get(id!),
    enabled: id != null && (options?.enabled ?? true),
  })
}

export function usePostMutations() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const invalidateCaches = () => {
    void queryClient.invalidateQueries({ queryKey: sysPostQueryKey.all })
    void queryClient.invalidateQueries({ queryKey: POST_QUERY_KEY })
  }

  const create = useMutation({
    mutationFn: (data: PostSaveReqDTO) => postApi.create(data),
    onSuccess: () => {
      message.success(t('systemPost.messages.createSuccess'))
      invalidateCaches()
    },
  })

  const update = useMutation({
    mutationFn: (data: PostSaveReqDTO) => postApi.update(data),
    onSuccess: () => {
      message.success(t('systemPost.messages.updateSuccess'))
      invalidateCaches()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => postApi.delete(id),
    onSuccess: () => {
      message.success(t('systemPost.messages.deleteSuccess'))
      invalidateCaches()
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: number[]) => postApi.deleteList(ids),
    onSuccess: (_d, ids) => {
      message.success(t('systemPost.messages.deleteBulkSuccess', { count: ids.length }))
      invalidateCaches()
    },
  })

  return { create, update, remove, removeMany }
}
