import { Icon } from '@iconify/react'
import {
  App,
  Button,
  Card,
  Result,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { tagsViewActions } from '@/app/slices/tags-view-slice'
import { useAppDispatch } from '@/app/store'
import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { useDictTypeSimpleList } from '@/shared/hooks/use-dict-type-simple-list'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'

import { dictDataApi } from '../api'
import {
  COLOR_TYPE_OPTIONS,
  COLOR_TYPE_TAG_MAP,
  DICT_DATA_DICT_TYPES,
  DICT_DATA_PERMISSIONS,
} from '../constants'
import type { ColorType, DictDataFilters, DictDataRespDTO } from '../types'
import { DictDataFormModal } from '../components/dict-data-form-modal'
import { DictDataSearchForm } from '../components/dict-data-search-form'
import { sysDictDataQueryKey, useDictDataMutations } from '../hooks'

export function DictDataListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()

  const dictType = searchParams.get('dictType')
  const tabId = searchParams.toString()

  const { data: typeList } = useDictTypeSimpleList()
  const typeName = useMemo(
    () => typeList.find(item => item.type === dictType)?.name,
    [typeList, dictType],
  )

  useEffect(() => {
    if (!dictType || !typeName) return
    dispatch(
      tagsViewActions.updateTitle({
        id: tabId,
        title: t('systemDictData.tabTitle', { name: typeName }),
      }),
    )
  }, [dictType, typeName, tabId, dispatch, t])

  const [searchVisible, setSearchVisible] = useState(true)
  const tableState = useTableState<DictDataFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{ open: boolean; id?: number }>({ open: false })

  const { tableProps, refetch } = usePagedQuery<DictDataRespDTO, DictDataFilters>({
    baseQueryKey: [...sysDictDataQueryKey.all, dictType],
    queryFn: params => dictDataApi.page({ ...params, dictType: dictType! }),
    tableState,
    enabled: !!dictType,
  })

  const { remove, removeMany } = useDictDataMutations()

  const colorTypeLabels = useMemo(
    () =>
      Object.fromEntries(
        COLOR_TYPE_OPTIONS.map(opt => [opt.value, t(`systemDictData.colorType.${opt.value}`)]),
      ) as Record<ColorType, string>,
    [t],
  )

  if (!dictType) {
    return (
      <Result
        status="warning"
        title={t('systemDictData.errors.missingDictType')}
        subTitle={t('systemDictData.errors.missingDictTypeHint')}
      />
    )
  }

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (record: DictDataRespDTO) => {
    setFormModal({ open: true, id: record.id })
  }

  const handleDeleteOne = (record: DictDataRespDTO) => {
    modal.confirm({
      title: t('systemDictData.confirm.deleteOne', { name: record.label }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(record.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('systemDictData.confirm.deleteMany', { count: selectedRowKeys.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeMany.mutateAsync(selectedRowKeys)
        setSelectedRowKeys([])
      },
    })
  }

  const columns: TableColumnsType<DictDataRespDTO> = [
    {
      title: t('systemDictData.table.sort'),
      dataIndex: 'sort',
      width: 80,
    },
    {
      title: t('systemDictData.table.label'),
      dataIndex: 'label',
    },
    {
      title: t('systemDictData.table.value'),
      dataIndex: 'value',
    },
    {
      title: t('systemDictData.table.status'),
      dataIndex: 'status',
      render: (status: number) => <DictTag dictType={DICT_DATA_DICT_TYPES.status} value={status} />,
    },
    {
      title: t('systemDictData.table.colorType'),
      dataIndex: 'colorType',
      render: (colorType: string | undefined) => {
        if (!colorType) return null
        const known = colorType as ColorType
        const tagColor = COLOR_TYPE_TAG_MAP[known] ?? 'default'
        const label = colorTypeLabels[known] ?? colorType
        return <Tag color={tagColor}>{label}</Tag>
      },
    },
    {
      title: t('systemDictData.table.createTime'),
      dataIndex: 'createTime',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('systemDictData.table.actions'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={DICT_DATA_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {t('systemDictData.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={DICT_DATA_PERMISSIONS.delete}>
            <Button type="link" size="small" danger onClick={() => handleDeleteOne(record)}>
              {t('systemDictData.actions.delete')}
            </Button>
          </HasPermission>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {t('systemDictData.page.title', { name: typeName ?? dictType })}
      </Typography.Title>

      <div
        style={{
          overflow: 'hidden',
          transition: 'max-height 300ms ease, opacity 200ms ease, margin-bottom 300ms ease',
          maxHeight: searchVisible ? 600 : 0,
          opacity: searchVisible ? 1 : 0,
          marginBottom: searchVisible ? 16 : 0,
        }}
      >
        <DictDataSearchForm
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
          <HasPermission code={DICT_DATA_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('systemDictData.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={DICT_DATA_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('systemDictData.actions.deleteSelected', { count: selectedRowKeys.length })}
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

      <Table<DictDataRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
        }}
      />

      <DictDataFormModal
        open={formModal.open}
        id={formModal.id}
        dictType={dictType}
        onClose={() => setFormModal({ open: false })}
      />
    </Card>
  )
}
