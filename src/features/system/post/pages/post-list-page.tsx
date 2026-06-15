import { Icon } from '@iconify/react'
import { App, Button, Card, Space, Table, Tooltip, type TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'

import { postApi } from '../api'
import { PostFormModal } from '../components/post-form-modal'
import { PostSearchForm } from '../components/post-search-form'
import { POST_DICT_TYPES, POST_PERMISSIONS } from '../constants'
import { sysPostQueryKey, usePostMutations } from '../hooks'
import type { PostFilters, PostRespDTO } from '../types'

export function PostListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()

  const [searchVisible, setSearchVisible] = useState(true)
  const tableState = useTableState<PostFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{ open: boolean; postId?: number }>({
    open: false,
  })

  const { tableProps, refetch } = usePagedQuery<PostRespDTO, PostFilters>({
    baseQueryKey: sysPostQueryKey.all,
    queryFn: postApi.page,
    tableState,
  })

  const { remove, removeMany } = usePostMutations()

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (post: PostRespDTO) => {
    setFormModal({ open: true, postId: post.id })
  }

  const handleDeleteOne = (post: PostRespDTO) => {
    modal.confirm({
      title: t('systemPost.confirm.deleteOne', { name: post.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(post.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('systemPost.confirm.deleteMany', {
        count: selectedRowKeys.length,
      }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeMany.mutateAsync(selectedRowKeys)
        setSelectedRowKeys([])
      },
    })
  }

  const columns: TableColumnsType<PostRespDTO> = [
    {
      title: t('systemPost.table.name'),
      dataIndex: 'name',
    },
    {
      title: t('systemPost.table.code'),
      dataIndex: 'code',
    },
    {
      title: t('systemPost.table.sort'),
      dataIndex: 'sort',
    },
    {
      title: t('systemPost.table.status'),
      dataIndex: 'status',
      render: (status: number) => <DictTag dictType={POST_DICT_TYPES.status} value={status} />,
    },
    {
      title: t('systemPost.table.createTime'),
      dataIndex: 'createTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('systemPost.table.actions'),
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={POST_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {t('systemPost.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={POST_PERMISSIONS.delete}>
            <Button type="link" size="small" danger onClick={() => handleDeleteOne(record)}>
              {t('systemPost.actions.delete')}
            </Button>
          </HasPermission>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <div
        style={{
          overflow: 'hidden',
          transition: 'max-height 300ms ease, opacity 200ms ease, margin-bottom 300ms ease',
          maxHeight: searchVisible ? 600 : 0,
          opacity: searchVisible ? 1 : 0,
          marginBottom: searchVisible ? 16 : 0,
        }}
      >
        <PostSearchForm
          loading={!!tableProps.loading}
          onSearch={filters => {
            setSelectedRowKeys([])
            tableState.setFilters(filters)
          }}
          onReset={() => {
            setSelectedRowKeys([])
            tableState.clearFilters()
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space style={{ marginBottom: 16 }}>
          <HasPermission code={POST_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('systemPost.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={POST_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('systemPost.actions.deleteSelected', {
                count: selectedRowKeys.length,
              })}
            </Button>
          </HasPermission>
        </Space>

        <Space>
          <Tooltip title={searchVisible ? t('common.hideSearch') : t('common.showSearch')}>
            <Button icon={<Icon icon="mdi:filter" />} onClick={() => setSearchVisible(v => !v)} />
          </Tooltip>
          <Tooltip title={t('common.refresh')}>
            <Button
              icon={<Icon icon="mdi:reload" />}
              loading={tableProps.loading}
              onClick={() => refetch()}
            />
          </Tooltip>
        </Space>
      </div>

      <Table<PostRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
        }}
      />

      <PostFormModal
        open={formModal.open}
        postId={formModal.postId}
        onClose={() => setFormModal({ open: false })}
      />
    </Card>
  )
}
