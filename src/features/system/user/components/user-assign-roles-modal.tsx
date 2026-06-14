import { App, Empty, Modal, Spin, Transfer, Typography } from 'antd'
import type { TransferProps } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRoleSimpleList } from '@/features/system/role/hooks'

import type { UserRespDTO } from '../types'
import { useUserMutations, useUserRolesQuery } from '@/features/system/user/hooks'

interface UserAssignRolesModalProps {
  open: boolean
  user: UserRespDTO | null
  onClose: () => void
}

type TransferItem = NonNullable<TransferProps['dataSource']>[number]

function roleIdsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x - y)
  const sortedB = [...b].sort((x, y) => x - y)
  return sortedA.every((id, index) => id === sortedB[index])
}

export function UserAssignRolesModal({ open, user, onClose }: UserAssignRolesModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()

  const userId = user?.id
  const [draft, setDraft] = useState<{ userId: number; keys: number[] } | null>(null)

  const rolesQuery = useRoleSimpleList({ enabled: open })
  const userRolesQuery = useUserRolesQuery(userId, { enabled: open && userId != null })
  const { assignRoles } = useUserMutations()

  const initialRoleIds = userRolesQuery.data ?? []
  const targetKeys = draft != null && draft.userId === userId ? draft.keys : initialRoleIds
  const transferKey = userId != null ? `${userId}-${initialRoleIds.join('-')}` : 'closed'

  const dataSource = useMemo<TransferItem[]>(
    () =>
      (rolesQuery.data ?? []).map(role => ({
        key: String(role.id),
        title: role.name,
        description: role.code,
      })),
    [rolesQuery.data],
  )

  const showLoading = open && (rolesQuery.isLoading || userRolesQuery.isLoading)

  const handleClose = () => {
    setDraft(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!user) return
    await assignRoles.mutateAsync({ userId: user.id, roleIds: targetKeys })
    handleClose()
  }

  const handleCancel = () => {
    if (roleIdsEqual(targetKeys, initialRoleIds)) {
      handleClose()
      return
    }
    appModal.confirm({
      title: t('systemUser.modal.discardChanges'),
      okText: t('systemUser.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => handleClose(),
    })
  }

  return (
    <Modal
      open={open}
      title={user ? t('systemUser.assignRoles.title', { username: user.username }) : ''}
      width={680}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={assignRoles.isPending}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Typography.Paragraph type="secondary">
        {t('systemUser.assignRoles.description')}
      </Typography.Paragraph>

      {showLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin description={t('systemUser.assignRoles.loading')} />
        </div>
      ) : dataSource.length === 0 ? (
        <Empty description={t('systemUser.assignRoles.noRoles')} />
      ) : (
        <Transfer
          key={transferKey}
          dataSource={dataSource}
          targetKeys={targetKeys.map(String)}
          titles={[t('systemUser.assignRoles.available'), t('systemUser.assignRoles.assigned')]}
          showSearch
          filterOption={(input, item) => {
            const query = input.toLowerCase()
            const title = String(item.title ?? '').toLowerCase()
            const description = String(item.description ?? '').toLowerCase()
            return title.includes(query) || description.includes(query)
          }}
          listStyle={{ width: 280, height: 360 }}
          onChange={keys => {
            if (userId == null) return
            setDraft({ userId, keys: keys.map(Number) })
          }}
          render={item => (
            <span>
              {item.title}
              {item.description ? (
                <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                  ({item.description})
                </Typography.Text>
              ) : null}
            </span>
          )}
        />
      )}
    </Modal>
  )
}
