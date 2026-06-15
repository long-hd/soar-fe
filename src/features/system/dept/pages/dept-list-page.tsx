import { Icon } from '@iconify/react'
import { App, Button, Card, Space, Table, Tooltip, type TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { useUserSimpleList } from '@/shared/hooks/use-user-simple-list'
import { formatDateTime } from '@/shared/lib/format'
import { buildTreeFromFlat, collectAncestorIds } from '@/shared/lib/tree'

import { DeptFormModal } from '../components/dept-form-modal'
import { DeptSearchForm } from '../components/dept-search-form'
import { DEPT_DICT_TYPES, DEPT_PERMISSIONS } from '../constants'
import { useDeptListQuery, useDeptMutations } from '../hooks'
import type { DeptFilters, DeptRespDTO, DeptTreeNode } from '../types'

/**
 * Department management tree list page.
 * Flat `/list` from BE → client tree → antd Table with expandable rows.
 */
export function DeptListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()

  const [filters, setFilters] = useState<DeptFilters>({})
  const [searchVisible, setSearchVisible] = useState(true)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{
    open: boolean
    id?: number
    parentIdPreset?: number
  }>({ open: false })

  const listQuery = useDeptListQuery(filters)
  const flatList = useMemo(() => listQuery.data ?? [], [listQuery.data])
  const isLoading = listQuery.isLoading

  const parentIdById = useMemo(() => new Map(flatList.map(d => [d.id, d.parentId])), [flatList])

  const tree = useMemo(
    () =>
      buildTreeFromFlat(flatList, {
        getId: d => d.id,
        getParentId: d => d.parentId,
      }),
    [flatList],
  )

  const hasActiveFilters = filters.name != null || filters.status != null

  const expandedRowKeys = useMemo(() => {
    if (!hasActiveFilters) return undefined
    return collectAncestorIds(
      flatList.map(d => d.id),
      id => parentIdById.get(id),
    )
  }, [hasActiveFilters, flatList, parentIdById])

  const { data: users } = useUserSimpleList()
  const nicknameById = useMemo(() => new Map(users.map(u => [u.id, u.nickname])), [users])

  const { remove, removeMany } = useDeptMutations()

  const hasChildren = (record: DeptTreeNode) => (record.children?.length ?? 0) > 0

  const renderLeader = (leaderUserId?: number) => {
    if (leaderUserId == null) return '—'
    return nicknameById.get(leaderUserId) ?? '—'
  }

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (record: DeptRespDTO) => {
    setFormModal({ open: true, id: record.id })
  }

  const handleAddChild = (record: DeptRespDTO) => {
    setFormModal({ open: true, parentIdPreset: record.id })
  }

  const handleDeleteOne = (record: DeptRespDTO) => {
    modal.confirm({
      title: t('systemDept.confirm.deleteOne', { name: record.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('systemDept.confirm.deleteMany', { count: selectedRowKeys.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeMany.mutateAsync(selectedRowKeys)
        setSelectedRowKeys([])
      },
    })
  }

  const handleSearch = (newFilters: DeptFilters) => {
    setSelectedRowKeys([])
    setFilters(newFilters)
  }

  const handleResetSearch = () => {
    setSelectedRowKeys([])
    setFilters({})
  }

  const columns: TableColumnsType<DeptTreeNode> = [
    {
      title: t('systemDept.table.name'),
      dataIndex: 'name',
    },
    {
      title: t('systemDept.table.leader'),
      dataIndex: 'leaderUserId',
      render: (leaderUserId: number | undefined) => renderLeader(leaderUserId),
    },
    {
      title: t('systemDept.table.sort'),
      dataIndex: 'sort',
    },
    {
      title: t('systemDept.table.status'),
      dataIndex: 'status',
      render: (status: number) => <DictTag dictType={DEPT_DICT_TYPES.status} value={status} />,
    },
    {
      title: t('systemDept.table.createTime'),
      dataIndex: 'createTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('systemDept.table.actions'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={DEPT_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {t('systemDept.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={DEPT_PERMISSIONS.create}>
            <Button type="link" size="small" onClick={() => handleAddChild(record)}>
              {t('systemDept.actions.addChild')}
            </Button>
          </HasPermission>
          <HasPermission code={DEPT_PERMISSIONS.delete}>
            {hasChildren(record) ? (
              <Tooltip title={t('systemDept.actions.deleteHasChildren')}>
                <Button type="link" size="small" danger disabled>
                  {t('systemDept.actions.delete')}
                </Button>
              </Tooltip>
            ) : (
              <Button type="link" size="small" danger onClick={() => handleDeleteOne(record)}>
                {t('systemDept.actions.delete')}
              </Button>
            )}
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
        <DeptSearchForm loading={isLoading} onSearch={handleSearch} onReset={handleResetSearch} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space style={{ marginBottom: 16 }}>
          <HasPermission code={DEPT_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('systemDept.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={DEPT_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('systemDept.actions.deleteSelected', { count: selectedRowKeys.length })}
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
              loading={isLoading}
              onClick={() => listQuery.refetch()}
            />
          </Tooltip>
        </Space>
      </div>

      <Table<DeptTreeNode>
        loading={isLoading}
        dataSource={tree}
        columns={columns}
        rowKey="id"
        pagination={false}
        expandable={{
          defaultExpandAllRows: true,
          expandedRowKeys,
          childrenColumnName: 'children',
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
          getCheckboxProps: record => ({
            disabled: hasChildren(record),
          }),
        }}
      />

      <DeptFormModal
        open={formModal.open}
        id={formModal.id}
        parentIdPreset={formModal.parentIdPreset}
        onClose={() => setFormModal({ open: false })}
      />
    </Card>
  )
}
