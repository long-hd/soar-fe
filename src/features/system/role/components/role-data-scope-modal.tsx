import { App, Form, Modal, Spin, Typography } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DeptTreeSelect } from '@/shared/components/dept-tree-select'
import { DictSelect } from '@/shared/components/dict-select'

import { ROLE_DATA_SCOPE, ROLE_DICT_TYPES } from '../constants'
import type { RoleAssignDataScopeReqDTO } from '../types'
import { useRoleDetailQuery, useRoleMutations } from '@/features/system/role/hooks'

interface RoleDataScopeModalProps {
  open: boolean
  role: { id: number; name: string } | null
  onClose: () => void
}

interface FormValues {
  dataScope: string
  dataScopeDeptIds?: number[]
}

export function RoleDataScopeModal({ open, role, onClose }: RoleDataScopeModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const roleId = role?.id
  const { assignDataScope } = useRoleMutations()
  const detailQuery = useRoleDetailQuery(roleId, { enabled: open && roleId != null })

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  useEffect(() => {
    if (!open || !detailQuery.data) return
    const { dataScope, dataScopeDeptIds } = detailQuery.data
    form.setFieldsValue({
      dataScope: String(dataScope),
      dataScopeDeptIds: dataScopeDeptIds ?? [],
    })
  }, [open, detailQuery.data, form])

  const showLoading = open && detailQuery.isLoading

  const handleSubmit = async () => {
    if (roleId == null) return
    const values = await form.validateFields()
    const scope = Number(values.dataScope)
    const isDeptCustom = scope === ROLE_DATA_SCOPE.DEPT_CUSTOM

    const dto: RoleAssignDataScopeReqDTO = {
      roleId,
      dataScope: scope,
      dataScopeDeptIds: isDeptCustom ? (values.dataScopeDeptIds ?? []) : null,
    }

    await assignDataScope.mutateAsync(dto)
    onClose()
  }

  const handleCancel = () => {
    if (!form.isFieldsTouched()) {
      onClose()
      return
    }
    appModal.confirm({
      title: t('systemRole.modal.discardChanges'),
      okText: t('systemRole.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  return (
    <Modal
      open={open}
      title={role ? t('systemRole.dataScope.title', { name: role.name }) : ''}
      width={560}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={assignDataScope.isPending}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Typography.Paragraph type="secondary">
        {t('systemRole.dataScope.description')}
      </Typography.Paragraph>

      {showLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin description={t('systemRole.dataScope.loading')} />
        </div>
      ) : (
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            name="dataScope"
            label={t('systemRole.dataScope.field.scope')}
            rules={[
              { required: true, message: t('systemRole.dataScope.validation.scopeRequired') },
            ]}
          >
            <DictSelect
              dictType={ROLE_DICT_TYPES.dataScope}
              placeholder={t('systemRole.dataScope.placeholder.scope')}
            />
          </Form.Item>

          <Form.Item shouldUpdate={(prev, cur) => prev.dataScope !== cur.dataScope} noStyle>
            {() => {
              const watchedScope = form.getFieldValue('dataScope')
              if (Number(watchedScope) !== ROLE_DATA_SCOPE.DEPT_CUSTOM) return null
              return (
                <Form.Item
                  name="dataScopeDeptIds"
                  label={t('systemRole.dataScope.field.deptIds')}
                  rules={[
                    {
                      required: true,
                      type: 'array',
                      min: 1,
                      message: t('systemRole.dataScope.validation.deptsRequired'),
                    },
                  ]}
                >
                  <DeptTreeSelect
                    treeCheckable
                    showCheckedStrategy="SHOW_PARENT"
                    placeholder={t('systemRole.dataScope.placeholder.depts')}
                  />
                </Form.Item>
              )
            }}
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
