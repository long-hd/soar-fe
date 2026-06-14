import { Icon } from '@iconify/react'
import { App, Button, Card, Space, Table, Tooltip, type TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'

import { roleApi } from '../api'
import { ROLE_DICT_TYPES, ROLE_PERMISSIONS, ROLE_TYPE } from '../constants'
import type { RoleFilters, RoleRespDTO } from '../types'
import { RoleSearchForm } from '@/features/system/role/components/role-search-form'
import { RoleFormModal } from '@/features/system/role/components/role-form-modal'
import { sysRoleQueryKey, useRoleMutations } from '@/features/system/role/hooks'

export function RoleListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()

  const [searchVisible, setSearchVisible] = useState(true)
  const tableState = useTableState<RoleFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{ open: boolean; roleId?: number }>({
    open: false,
  })

  const { tableProps, refetch } = usePagedQuery<RoleRespDTO, RoleFilters>({
    baseQueryKey: sysRoleQueryKey.all,
    queryFn: roleApi.page,
    tableState,
  })

  const { remove, removeMany } = useRoleMutations()

  const isSystemRole = (record: RoleRespDTO) => record.type === ROLE_TYPE.SYSTEM

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (role: RoleRespDTO) => {
    setFormModal({ open: true, roleId: role.id })
  }

  const handleDeleteOne = (role: RoleRespDTO) => {
    modal.confirm({
      title: t('systemRole.confirm.deleteOne', { name: role.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(role.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('systemRole.confirm.deleteMany', {
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

  const columns: TableColumnsType<RoleRespDTO> = [
    {
      title: t('systemRole.table.name'),
      dataIndex: 'name',
    },
    {
      title: t('systemRole.table.code'),
      dataIndex: 'code',
    },
    {
      title: t('systemRole.table.sort'),
      dataIndex: 'sort',
    },
    {
      title: t('systemRole.table.status'),
      dataIndex: 'status',
      render: (status: number) => <DictTag dictType={ROLE_DICT_TYPES.status} value={status} />,
    },
    {
      title: t('systemRole.table.type'),
      dataIndex: 'type',
      render: (type: number) => <DictTag dictType={ROLE_DICT_TYPES.type} value={type} />,
    },
    {
      title: t('systemRole.table.createTime'),
      dataIndex: 'createTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('systemRole.table.actions'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={ROLE_PERMISSIONS.update}>
            <Button
              type="link"
              size="small"
              disabled={isSystemRole(record)}
              onClick={() => handleEdit(record)}
            >
              {t('systemRole.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={ROLE_PERMISSIONS.delete}>
            <Button
              type="link"
              size="small"
              danger
              disabled={isSystemRole(record)}
              onClick={() => handleDeleteOne(record)}
            >
              {t('systemRole.actions.delete')}
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
        <RoleSearchForm
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
          <HasPermission code={ROLE_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('systemRole.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={ROLE_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('systemRole.actions.deleteSelected', {
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

      <Table<RoleRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
          getCheckboxProps: record => ({
            disabled: isSystemRole(record),
          }),
        }}
      />

      <RoleFormModal
        open={formModal.open}
        roleId={formModal.roleId}
        onClose={() => setFormModal({ open: false })}
      />
    </Card>
  )
}
