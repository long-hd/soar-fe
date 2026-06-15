import { Icon } from '@iconify/react'
import { App, Button, Card, Space, Table, Tooltip, type TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { formatDateTime } from '@/shared/lib/format'
import { buildTreeFromFlat, collectAncestorIds } from '@/shared/lib/tree'

import { MenuFormModal } from '../components/menu-form-modal'
import { MenuSearchForm } from '../components/menu-search-form'
import { MenuTypeTag } from '../components/menu-type-tag'
import { MENU_DICT_TYPES, MENU_PERMISSIONS } from '../constants'
import { useMenuListQuery, useMenuMutations } from '../hooks'
import type { MenuFilters, MenuRespDTO, MenuTreeNode } from '../types'

/**
 * Menu management tree list page.
 * Flat `/list` from BE → client tree → antd Table with expandable rows.
 * Form fields vary by menu type in the unified modal.
 */
export function MenuListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()

  const [filters, setFilters] = useState<MenuFilters>({})
  const [searchVisible, setSearchVisible] = useState(true)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{
    open: boolean
    id?: number
    parentIdPreset?: number
  }>({ open: false })

  const listQuery = useMenuListQuery(filters)
  const flatList = useMemo(() => listQuery.data ?? [], [listQuery.data])
  const isLoading = listQuery.isLoading

  const parentIdById = useMemo(() => new Map(flatList.map(m => [m.id, m.parentId])), [flatList])

  const tree = useMemo(
    () =>
      buildTreeFromFlat(flatList, {
        getId: m => m.id,
        getParentId: m => m.parentId,
      }),
    [flatList],
  )

  const hasActiveFilters = filters.name != null || filters.status != null

  const expandedRowKeys = useMemo(() => {
    if (!hasActiveFilters) return undefined
    return collectAncestorIds(
      flatList.map(m => m.id),
      id => parentIdById.get(id),
    )
  }, [hasActiveFilters, flatList, parentIdById])

  const { remove, removeMany } = useMenuMutations()

  const hasChildren = (record: MenuTreeNode) => (record.children?.length ?? 0) > 0

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (record: MenuRespDTO) => {
    setFormModal({ open: true, id: record.id })
  }

  const handleAddChild = (record: MenuRespDTO) => {
    setFormModal({ open: true, parentIdPreset: record.id })
  }

  const handleDeleteOne = (record: MenuRespDTO) => {
    modal.confirm({
      title: t('systemMenu.confirm.deleteOne', { name: record.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('systemMenu.confirm.deleteMany', { count: selectedRowKeys.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeMany.mutateAsync(selectedRowKeys)
        setSelectedRowKeys([])
      },
    })
  }

  const handleSearch = (newFilters: MenuFilters) => {
    setSelectedRowKeys([])
    setFilters(newFilters)
  }

  const handleResetSearch = () => {
    setSelectedRowKeys([])
    setFilters({})
  }

  const columns: TableColumnsType<MenuTreeNode> = [
    {
      title: t('systemMenu.table.name'),
      dataIndex: 'name',
      render: (name: string, record) => (
        <Space size={4}>
          {record.icon ? <Icon icon={record.icon} /> : null}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: t('systemMenu.table.type'),
      dataIndex: 'type',
      width: 100,
      render: (type: number) => <MenuTypeTag type={type} />,
    },
    {
      title: t('systemMenu.table.sort'),
      dataIndex: 'sort',
      width: 80,
    },
    {
      title: t('systemMenu.table.tabKey'),
      dataIndex: 'tabKey',
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: t('systemMenu.table.permission'),
      dataIndex: 'permission',
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: t('systemMenu.table.status'),
      dataIndex: 'status',
      width: 100,
      render: (status: number) => <DictTag dictType={MENU_DICT_TYPES.status} value={status} />,
    },
    {
      title: t('systemMenu.table.createTime'),
      dataIndex: 'createTime',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('systemMenu.table.actions'),
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={MENU_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {t('systemMenu.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={MENU_PERMISSIONS.create}>
            <Button type="link" size="small" onClick={() => handleAddChild(record)}>
              {t('systemMenu.actions.addChild')}
            </Button>
          </HasPermission>
          <HasPermission code={MENU_PERMISSIONS.delete}>
            {hasChildren(record) ? (
              <Tooltip title={t('systemMenu.actions.deleteHasChildren')}>
                <Button type="link" size="small" danger disabled>
                  {t('systemMenu.actions.delete')}
                </Button>
              </Tooltip>
            ) : (
              <Button type="link" size="small" danger onClick={() => handleDeleteOne(record)}>
                {t('systemMenu.actions.delete')}
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
        <MenuSearchForm loading={isLoading} onSearch={handleSearch} onReset={handleResetSearch} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space style={{ marginBottom: 16 }}>
          <HasPermission code={MENU_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('systemMenu.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={MENU_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('systemMenu.actions.deleteSelected', { count: selectedRowKeys.length })}
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

      <Table<MenuTreeNode>
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

      <MenuFormModal
        open={formModal.open}
        id={formModal.id}
        parentIdPreset={formModal.parentIdPreset}
        onClose={() => setFormModal({ open: false })}
      />
    </Card>
  )
}
