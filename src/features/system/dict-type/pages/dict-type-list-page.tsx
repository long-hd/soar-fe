import { Icon } from '@iconify/react'
import { App, Button, Card, Space, Table, Tooltip, type TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'

import { dictTypeApi } from '../api'
import { DICT_TYPE_DICT_TYPES, DICT_TYPE_PERMISSIONS } from '../constants'
import type { DictTypeFilters, DictTypeRespDTO } from '../types'
import { DictTypeFormModal } from '../components/dict-type-form-modal'
import { DictTypeSearchForm } from '../components/dict-type-search-form'
import { sysDictTypeQueryKey, useDictTypeMutations } from '../hooks'

export function DictTypeListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const navigate = useNavigate()

  const [searchVisible, setSearchVisible] = useState(true)
  const tableState = useTableState<DictTypeFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{ open: boolean; id?: number }>({ open: false })

  const { tableProps, refetch } = usePagedQuery<DictTypeRespDTO, DictTypeFilters>({
    baseQueryKey: sysDictTypeQueryKey.all,
    queryFn: dictTypeApi.page,
    tableState,
  })

  const { remove, removeMany } = useDictTypeMutations()

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (record: DictTypeRespDTO) => {
    setFormModal({ open: true, id: record.id })
  }

  const handleViewData = (record: DictTypeRespDTO) => {
    navigate({
      pathname: '/',
      search: new URLSearchParams({
        tab: 'system-dict-data',
        dictType: record.type,
      }).toString(),
    })
  }

  const handleDeleteOne = (record: DictTypeRespDTO) => {
    modal.confirm({
      title: t('systemDictType.confirm.deleteOne', { name: record.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('systemDictType.confirm.deleteMany', { count: selectedRowKeys.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeMany.mutateAsync(selectedRowKeys)
        setSelectedRowKeys([])
      },
    })
  }

  const columns: TableColumnsType<DictTypeRespDTO> = [
    {
      title: t('systemDictType.table.name'),
      dataIndex: 'name',
    },
    {
      title: t('systemDictType.table.type'),
      dataIndex: 'type',
    },
    {
      title: t('systemDictType.table.status'),
      dataIndex: 'status',
      render: (status: number) => <DictTag dictType={DICT_TYPE_DICT_TYPES.status} value={status} />,
    },
    {
      title: t('systemDictType.table.createTime'),
      dataIndex: 'createTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('systemDictType.table.actions'),
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={DICT_TYPE_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {t('systemDictType.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={DICT_TYPE_PERMISSIONS.delete}>
            <Button type="link" size="small" danger onClick={() => handleDeleteOne(record)}>
              {t('systemDictType.actions.delete')}
            </Button>
          </HasPermission>
          <HasPermission code={DICT_TYPE_PERMISSIONS.query}>
            <Button
              type="link"
              size="small"
              icon={<Icon icon="mdi:format-list-bulleted" />}
              onClick={() => handleViewData(record)}
            >
              {t('systemDictType.actions.viewData')}
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
        <DictTypeSearchForm
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
          <HasPermission code={DICT_TYPE_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('systemDictType.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={DICT_TYPE_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('systemDictType.actions.deleteSelected', { count: selectedRowKeys.length })}
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

      <Table<DictTypeRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
        }}
      />

      <DictTypeFormModal
        open={formModal.open}
        id={formModal.id}
        onClose={() => setFormModal({ open: false })}
      />
    </Card>
  )
}
