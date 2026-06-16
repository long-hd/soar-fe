import { App, Empty, Modal, Spin, Tree, Typography } from 'antd'
import type { DataNode } from 'antd/es/tree'
import type { Key } from 'antd/es/table/interface'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRoleMenuIdsQuery, useRoleMutations } from '@/features/system/role/hooks'
import type { MenuSimpleDTO } from '@/shared/api/lookup/menu'
import { useMenuTree } from '@/shared/hooks/use-menu-tree'
import type { TreeNode } from '@/shared/lib/tree'

interface RoleMenuAssignmentModalProps {
  open: boolean
  role: { id: number; name: string } | null
  onClose: () => void
}

function toAntdTreeData(nodes: TreeNode<MenuSimpleDTO>[]): DataNode[] {
  return nodes.map(n => ({
    title: n.name,
    key: n.id,
    children: n.children?.length ? toAntdTreeData(n.children) : undefined,
  }))
}

function submitShapeSet(checked: number[], halfChecked: number[]): Set<number> {
  return new Set([...checked, ...halfChecked])
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

/** Modal for assigning menu permissions to a role via checkable menu tree. */
export function RoleMenuAssignmentModal({ open, role, onClose }: RoleMenuAssignmentModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()

  const roleId = role?.id
  const [draft, setDraft] = useState<{
    roleId: number
    checkedKeys: number[]
    halfCheckedKeys: number[]
  } | null>(null)

  const { assignRoleMenu } = useRoleMutations()
  const menuIdsQuery = useRoleMenuIdsQuery(roleId, { enabled: open && roleId != null })
  const menuTree = useMenuTree()

  const initialMenuIds = useMemo(() => menuIdsQuery.data ?? [], [menuIdsQuery.data])
  const checkedKeys =
    draft != null && draft.roleId === roleId ? draft.checkedKeys : Array.from(initialMenuIds)
  const halfCheckedKeys = draft != null && draft.roleId === roleId ? draft.halfCheckedKeys : []

  const initialKeysSet = useMemo(() => new Set(initialMenuIds), [initialMenuIds])

  const treeData = useMemo(() => toAntdTreeData(menuTree.data), [menuTree.data])

  const treeKey =
    roleId != null && menuIdsQuery.data
      ? `${roleId}-${[...menuIdsQuery.data].sort((a, b) => a - b).join('-')}`
      : 'closed'

  const showLoading = open && (menuIdsQuery.isLoading || menuTree.isLoading)
  const isDataReady = !showLoading && roleId != null

  const handleCheck = (
    checked: Key[] | { checked: Key[]; halfChecked: Key[] },
    info: { halfCheckedKeys?: Key[] },
  ) => {
    if (roleId == null) return
    setDraft({
      roleId,
      checkedKeys: checked as number[],
      halfCheckedKeys: (info.halfCheckedKeys ?? []) as number[],
    })
  }

  const handleClose = () => {
    setDraft(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (roleId == null) return
    const menuIds = [...submitShapeSet(checkedKeys, halfCheckedKeys)]
    await assignRoleMenu.mutateAsync({ roleId, menuIds })
    handleClose()
  }

  const handleCancel = () => {
    const current = submitShapeSet(checkedKeys, halfCheckedKeys)
    if (setsEqual(current, initialKeysSet)) {
      handleClose()
      return
    }
    appModal.confirm({
      title: t('systemRole.modal.discardChanges'),
      okText: t('systemRole.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => handleClose(),
    })
  }

  return (
    <Modal
      open={open}
      title={role ? t('systemRole.menuAssignment.title', { name: role.name }) : ''}
      width={720}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !isDataReady }}
      confirmLoading={assignRoleMenu.isPending}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Typography.Paragraph type="secondary">
        {t('systemRole.menuAssignment.description')}
      </Typography.Paragraph>

      {showLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin description={t('systemRole.menuAssignment.loading')} />
        </div>
      ) : treeData.length === 0 ? (
        <Empty description={t('systemRole.menuAssignment.empty')} />
      ) : (
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          <Tree
            key={treeKey}
            checkable
            defaultExpandAll
            treeData={treeData}
            checkedKeys={checkedKeys}
            onCheck={handleCheck}
          />
        </div>
      )}
    </Modal>
  )
}
