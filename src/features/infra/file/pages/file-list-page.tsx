import { Icon } from '@iconify/react'
import {
  App,
  Button,
  Card,
  Image,
  Space,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HasPermission } from '@/features/permission'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'
import { copyToClipboard } from '@/shared/lib/clipboard'
import { formatBytes, formatDateTime } from '@/shared/lib/format'

import { fileApi } from '../api'
import { FileSearchForm } from '../components/file-search-form'
import { FileUploadModal } from '../components/file-upload-modal'
import { FILE_PERMISSIONS, PREVIEWABLE_IMAGE_PREFIX, PREVIEWABLE_PDF_TYPE } from '../constants'
import { fileKey, useFileMutations } from '../hooks'
import type { FileFilters, FileRespDTO } from '../types'

export function FileListPage() {
  const { t } = useTranslation()
  const { modal, message } = App.useApp()

  const [searchVisible, setSearchVisible] = useState(true)
  const tableState = useTableState<FileFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [uploadModal, setUploadModal] = useState({ open: false })

  const { tableProps, refetch } = usePagedQuery<FileRespDTO, FileFilters>({
    baseQueryKey: fileKey.all,
    queryFn: fileApi.page,
    tableState,
  })

  const { remove, removeMany } = useFileMutations()

  const handleUpload = () => setUploadModal({ open: true })

  const handleCloseUploadModal = () => setUploadModal({ open: false })

  const handleCopyUrl = async (url: string) => {
    const ok = await copyToClipboard(url)
    if (ok) {
      message.success(t('infraFile.messages.copySuccess'))
    } else {
      message.error(t('infraFile.messages.copyFailed'))
    }
  }

  const handleDeleteOne = (record: FileRespDTO) => {
    modal.confirm({
      title: t('infraFile.confirm.deleteOne', { name: record.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('infraFile.confirm.deleteMany', { count: selectedRowKeys.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeMany.mutateAsync(selectedRowKeys)
        setSelectedRowKeys([])
      },
    })
  }

  const columns: TableColumnsType<FileRespDTO> = [
    {
      title: t('infraFile.table.name'),
      dataIndex: 'name',
      ellipsis: true,
      render: (name: string) => (
        <Typography.Text ellipsis copyable={false}>
          {name}
        </Typography.Text>
      ),
    },
    {
      title: t('infraFile.table.type'),
      dataIndex: 'type',
      ellipsis: true,
    },
    {
      title: t('infraFile.table.size'),
      dataIndex: 'size',
      width: 100,
      render: (size: number) => formatBytes(size),
    },
    {
      title: t('infraFile.table.preview'),
      key: 'preview',
      width: 100,
      render: (_, record) => {
        if (record.type.startsWith(PREVIEWABLE_IMAGE_PREFIX)) {
          return (
            <Image
              src={record.url}
              width={64}
              height={64}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          )
        }
        if (record.type === PREVIEWABLE_PDF_TYPE) {
          return (
            <a href={record.url} target="_blank" rel="noreferrer">
              {t('infraFile.actions.preview')}
            </a>
          )
        }
        return <Typography.Text type="secondary">—</Typography.Text>
      },
    },
    {
      title: t('infraFile.table.createTime'),
      dataIndex: 'createTime',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('infraFile.table.actions'),
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={FILE_PERMISSIONS.query}>
            <Tooltip title={t('infraFile.actions.copyUrl')}>
              <Button
                type="link"
                size="small"
                icon={<Icon icon="mdi:content-copy" />}
                onClick={() => void handleCopyUrl(record.url)}
              />
            </Tooltip>
          </HasPermission>
          <Tooltip title={t('infraFile.actions.download')}>
            <Button
              type="link"
              size="small"
              icon={<Icon icon="mdi:download" />}
              href={record.url}
              target="_blank"
              rel="noreferrer"
              download={record.name}
            />
          </Tooltip>
          <HasPermission code={FILE_PERMISSIONS.delete}>
            <Tooltip title={t('infraFile.actions.delete')}>
              <Button
                type="link"
                size="small"
                danger
                icon={<Icon icon="mdi:delete-outline" />}
                onClick={() => handleDeleteOne(record)}
              />
            </Tooltip>
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
        <FileSearchForm
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
          <HasPermission code={FILE_PERMISSIONS.create}>
            <Button type="primary" onClick={handleUpload}>
              {t('infraFile.actions.upload')}
            </Button>
          </HasPermission>
          <HasPermission code={FILE_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('infraFile.actions.deleteSelected', { count: selectedRowKeys.length })}
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

      <Table<FileRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
        }}
      />

      <FileUploadModal open={uploadModal.open} onClose={handleCloseUploadModal} />
    </Card>
  )
}
