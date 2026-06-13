import { App, Button, Card, Space, Switch, Table, type TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { selectUser } from '@/app/slices/auth-slice'
import { useAppSelector } from '@/app/store'
import { HasPermission } from '@/features/permission'
import { DictTag } from '@/shared/components/dict-tag'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'
import type { SortParams } from '@/shared/types/api'

import { userApi } from '../api'
import { USER_DICT_TYPES, USER_PERMISSIONS, UserStatus } from '@/features/system/user/constants'
import type { UserFilters, UserRespDTO } from '../types'
import { UserSearchForm } from '@/features/system/user/components/user-search-form'
import { UserFormModal } from '@/features/system/user/components/user-form-modal'
import { UserResetPasswordModal } from '@/features/system/user/components/user-reset-password-modal'
import { sysUserQueryKey, useUserMutations } from '@/features/system/user/hooks'
import { Icon } from '@iconify/react'

/**
 * User Management list page.
 *
 * Composition:
 *  - useTableState — in-memory filters/page/sort. Activity keep-alive preserves
 *    across tab switches. F5 resets (no URL sync per Q1=B).
 *  - usePagedQuery — fetches `/page` + builds antd tableProps.
 *  - 3 useMutation: remove, removeMany, updateStatus. Invalidate USER_QUERY_KEY
 *    on success → list refetches.
 *
 * Modals (Create/Edit form, Reset Password) are stubbed in T2.2 with `message.info`
 * toasts. T2.3 wires the form modal; T2.4 wires the reset-password modal.
 *
 * Self-protection (T2.0-D8):
 *  - Cannot delete self (button disabled, checkbox disabled)
 *  - Cannot toggle own status (Switch disabled)
 *  - CAN edit self (own profile), CAN reset own password (workflow valid)
 */

/** Initial sort: createTime DESC (newest first) per T2.0-D5. */
const INITIAL_SORT: SortParams = { field: 'createTime', order: 'desc' }

export function UserListPage() {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const currentUser = useAppSelector(selectUser)

  const [searchVisible, setSearchVisible] = useState(true)
  const tableState = useTableState<UserFilters>({}, INITIAL_SORT)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [formModal, setFormModal] = useState<{ open: boolean; userId?: number }>({
    open: false,
  })
  const [resetPwdModal, setResetPwdModal] = useState<{
    open: boolean
    user: UserRespDTO | null
  }>({ open: false, user: null })

  const { tableProps, refetch } = usePagedQuery<UserRespDTO, UserFilters>({
    baseQueryKey: sysUserQueryKey.all,
    queryFn: userApi.page,
    tableState,
  })

  // ===== Mutations =====

  const { remove, removeMany, updateStatus } = useUserMutations()

  // ===== Helpers =====

  const isSelf = (record: UserRespDTO) => record.id === currentUser?.id

  // ===== Handlers =====

  const handleCreate = () => setFormModal({ open: true })

  const handleEdit = (user: UserRespDTO) => {
    setFormModal({ open: true, userId: user.id })
  }
  const handleResetPassword = (user: UserRespDTO) => {
    setResetPwdModal({ open: true, user })
  }

  const handleDeleteOne = (user: UserRespDTO) => {
    modal.confirm({
      title: t('systemUser.confirm.deleteOne', { name: user.username }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => remove.mutateAsync(user.id),
    })
  }

  const handleDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return
    modal.confirm({
      title: t('systemUser.confirm.deleteMany', {
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

  const handleStatusToggle = (user: UserRespDTO, checked: boolean) => {
    const newStatus = checked ? UserStatus.ENABLED : UserStatus.DISABLED
    updateStatus.mutate({ id: user.id, status: newStatus })
  }

  // ===== Columns =====

  const columns: TableColumnsType<UserRespDTO> = [
    {
      title: t('systemUser.table.username'),
      dataIndex: 'username',
      sorter: true,
    },
    {
      title: t('systemUser.table.nickname'),
      dataIndex: 'nickname',
    },
    {
      title: t('systemUser.table.deptName'),
      dataIndex: 'deptName',
      render: (v: string | undefined) => v ?? '-',
    },
    {
      title: t('systemUser.table.mobile'),
      dataIndex: 'mobile',
      render: (v: string | undefined) => v ?? '-',
    },
    {
      title: t('systemUser.table.status'),
      dataIndex: 'status',
      render: (status: number, record) => (
        <HasPermission
          code={USER_PERMISSIONS.update}
          fallback={<DictTag dictType={USER_DICT_TYPES.status} value={status} />}
        >
          <Switch
            checked={status === UserStatus.ENABLED}
            disabled={isSelf(record) || updateStatus.isPending}
            onChange={checked => handleStatusToggle(record, checked)}
          />
        </HasPermission>
      ),
    },
    {
      title: t('systemUser.table.createTime'),
      dataIndex: 'createTime',
      sorter: true,
      defaultSortOrder: 'descend',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: t('systemUser.table.actions'),
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <HasPermission code={USER_PERMISSIONS.update}>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              {t('systemUser.actions.edit')}
            </Button>
          </HasPermission>
          <HasPermission code={USER_PERMISSIONS.delete}>
            <Button
              type="link"
              size="small"
              danger
              disabled={isSelf(record)}
              onClick={() => handleDeleteOne(record)}
            >
              {t('systemUser.actions.delete')}
            </Button>
          </HasPermission>
          <HasPermission code={USER_PERMISSIONS.updatePassword}>
            <Button type="link" size="small" onClick={() => handleResetPassword(record)}>
              {t('systemUser.actions.resetPassword')}
            </Button>
          </HasPermission>
        </Space>
      ),
    },
  ]

  // ===== Render =====

  return (
    <Card>
      <div
        style={{
          overflow: 'hidden',
          transition: 'max-height 300ms ease, opacity 200ms ease, margin-bottom 300ms ease',
          maxHeight: searchVisible ? 600 : 0, // 600 = safely above form height (kể cả wrap)
          opacity: searchVisible ? 1 : 0,
          marginBottom: searchVisible ? 16 : 0,
        }}
      >
        <UserSearchForm
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
          <HasPermission code={USER_PERMISSIONS.create}>
            <Button type="primary" onClick={handleCreate}>
              {t('systemUser.actions.create')}
            </Button>
          </HasPermission>
          <HasPermission code={USER_PERMISSIONS.delete}>
            <Button
              danger
              disabled={selectedRowKeys.length === 0 || removeMany.isPending}
              onClick={handleDeleteBulk}
            >
              {t('systemUser.actions.deleteSelected', {
                count: selectedRowKeys.length,
              })}
            </Button>
          </HasPermission>
        </Space>

        <Space style={{ marginBottom: 16 }}>
          <Button
            type="default"
            icon={<Icon icon="mdi:filter" />}
            onClick={() => setSearchVisible(v => !v)}
          />
          <Button type="default" icon={<Icon icon="mdi:reload" />} onClick={() => refetch()} />
        </Space>
      </div>

      <Table<UserRespDTO>
        {...tableProps}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as number[]),
          getCheckboxProps: record => ({
            disabled: isSelf(record),
          }),
        }}
      />

      <UserFormModal
        open={formModal.open}
        userId={formModal.userId}
        onClose={() => setFormModal({ open: false })}
      />
      <UserResetPasswordModal
        open={resetPwdModal.open}
        user={resetPwdModal.user}
        onClose={() => setResetPwdModal({ open: false, user: null })}
      />
    </Card>
  )
}
