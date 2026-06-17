import { Icon } from '@iconify/react'
import { App, Button, Card, Space, Table, Tag, Tooltip, type TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HasPermission, usePermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'
import { formatDateTime } from '@/shared/lib/format'

import { fileConfigApi } from '../api'
import { FileConfigFormModal } from '../components/file-config-form-modal'
import { FileConfigSearchForm } from '../components/file-config-search-form'
import { FILE_CONFIG_DICT_TYPES, FILE_CONFIG_PERMISSIONS } from '../constants'
import { fileConfigKey, useFileConfigMutations } from '../hooks'
import type { FileConfigFilters, FileConfigRespDTO } from '../types'

export function FileConfigListPage() {
  const { t } = useTranslation()
  const { modal, notification } = App.useApp()
  const { has } = usePermission()

  const [searchVisible, setSearchVisible] = useState(true)
  const tableState = useTableState<FileConfigFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [testingId, setTestingId] = useState<number | null>(null)
  const [formModal, setFormModal] = useState<{ open: boolean; configId?: number }>({
    open: false,
  })

  const { tableProps, refetch } = usePagedQuery<FileConfigRespDTO, FileConfigFilters>({
    baseQueryKey: fileConfigKey.all,
    queryFn: fileConfigApi.page,
    tableState,
  })

  const { remove, removeMany, updateMaster } = useFileConfigMutations()

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (record: FileConfigRespDTO) => {
    setFormModal({ open: true, configId: record.id })
  }

  const handleCloseFormModal = () => setFormModal({ open: false })

  const handleSetMaster = (record: FileConfigRespDTO) => {
    modal.confirm({
      title: t('infraFileConfig.confirm.setMaster', { name: record.name }),
      okText: t('infraFileConfig.actions.setMaster'),
      cancelText: t('common.cancel'),
      onOk: () => updateMaster.mutateAsync(record.id),
    })
  }

  const handleTest = async (record: FileConfigRespDTO) => {
    setTestingId(record.id)
    try {
      const url = await fileConfigApi.test(record.id)
      notification.success({
        message: t('infraFileConfig.test.success'),
        description: (
          <a href={url} target="_blank" rel="noreferrer">
            {t('infraFileConfig.test.openLink')}
          </a>
        ),
        duration: 10,
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleDeleteOne = (record: FileConfigRespDTO) => {
    modal.confirm({
      title: t('infraFileConfig.confirm.deleteOne', { name: record.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('infraFileConfig.confirm.deleteMany', {
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

  const columns: TableColumnsType<FileConfigRespDTO> = [
    {
      title: t('infraFileConfig.table.id'),
      dataIndex: 'id',
      width: 80,
    },
    {
      title: t('infraFileConfig.table.name'),
      dataIndex: 'name',
    },
    {
      title: t('infraFileConfig.table.storage'),
      dataIndex: 'storage',
      render: (storage: number) => (
        <DictTag dictType={FILE_CONFIG_DICT_TYPES.storage} value={storage} />
      ),
    },
    {
      title: t('infraFileConfig.table.master'),
      dataIndex: 'master',
      render: (master: boolean) => (
        <Tag color={master ? 'success' : 'default'}>
          {master ? t('infraFileConfig.table.masterYes') : t('infraFileConfig.table.masterNo')}
        </Tag>
      ),
    },
    {
      title: t('infraFileConfig.table.remark'),
      dataIndex: 'remark',
      ellipsis: true,
    },
    {
      title: t('infraFileConfig.table.createTime'),
      dataIndex: 'createTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('infraFileConfig.table.actions'),
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={FILE_CONFIG_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {t('infraFileConfig.actions.edit')}
            </Button>
          </HasPermission>
          {has(FILE_CONFIG_PERMISSIONS.update) && !record.master ? (
            <Button type="link" size="small" onClick={() => handleSetMaster(record)}>
              {t('infraFileConfig.actions.setMaster')}
            </Button>
          ) : null}
          <HasPermission code={FILE_CONFIG_PERMISSIONS.query}>
            <Button
              type="link"
              size="small"
              loading={testingId === record.id}
              onClick={() => void handleTest(record)}
            >
              {t('infraFileConfig.actions.test')}
            </Button>
          </HasPermission>
          <HasPermission code={FILE_CONFIG_PERMISSIONS.delete}>
            <Button type="link" size="small" danger onClick={() => handleDeleteOne(record)}>
              {t('infraFileConfig.actions.delete')}
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
        <FileConfigSearchForm
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
          <HasPermission code={FILE_CONFIG_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('infraFileConfig.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={FILE_CONFIG_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('infraFileConfig.actions.deleteSelected', {
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

      <Table<FileConfigRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
          getCheckboxProps: record => ({
            disabled: record.master,
          }),
        }}
      />

      <FileConfigFormModal
        open={formModal.open}
        configId={formModal.configId}
        onClose={handleCloseFormModal}
      />
    </Card>
  )
}
