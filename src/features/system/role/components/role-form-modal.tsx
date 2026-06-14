import { App, Col, Form, Input, InputNumber, Modal, Row, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { ROLE_DICT_TYPES, ROLE_STATUS } from '../constants'
import type { RoleSaveReqDTO } from '../types'
import { useRoleDetailQuery, useRoleMutations } from '@/features/system/role/hooks'

/**
 * Create + edit modal — single component, mode chosen via `roleId` prop.
 *
 * Edit mode (roleId set):
 *   - Fires `roleApi.get(roleId)` via useQuery to fetch fresh data.
 *   - Modal body shows Spin while loading; form renders once data resolves.
 *   - `code` field disabled — role code is the immutable identifier.
 *
 * Create mode (roleId undefined):
 *   - Empty form with `status` pre-filled to ENABLED.
 *   - BE forces `status=ENABLED, type=CUSTOM, dataScope=ALL` regardless of payload.
 *
 * Form state lifecycle:
 *   - `Form.useForm()` instance lives in this component (not in modal DOM).
 *   - `destroyOnHidden` destroys Form children but the instance state persists.
 *   - Reset useEffect clears on every open; detail useEffect repopulates for edit.
 *   - `open` is in detail useEffect deps so reopening the same roleId (cached
 *     data, unchanged reference) still refires after the reset.
 *
 * Form value shape diverges from `RoleSaveReqDTO` for dict-typed `status`:
 *   - Held as string in form (DictSelect emit) → converted to number at submit.
 *   - Matches "DictSelect tax" pattern (ADR 0004).
 */

interface RoleFormModalProps {
  open: boolean
  /** undefined = create mode, set = edit mode for that role id. */
  roleId?: number
  onClose: () => void
}

interface FormValues {
  name: string
  code: string
  sort: number
  status: string
  remark?: string
}

export function RoleFormModal({ open, roleId, onClose }: RoleFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = roleId != null

  const { create, update } = useRoleMutations()
  const detailQuery = useRoleDetailQuery(roleId, { enabled: open && isEdit })

  // Reset form on each open. For Create, fields return to initialValues (status='0').
  // For Edit, fields clear briefly before detail useEffect populates them.
  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  // Populate when modal opens in edit mode + detail arrives.
  // `open` in deps so reopening same roleId (cached, unchanged reference) refires.
  useEffect(() => {
    if (!open || !detailQuery.data) return
    const role = detailQuery.data
    form.setFieldsValue({
      name: role.name,
      code: role.code,
      sort: role.sort,
      status: String(role.status),
      remark: role.remark,
    })
  }, [open, detailQuery.data, form])

  const isSubmitting = create.isPending || update.isPending

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const dto: RoleSaveReqDTO = {
      name: values.name.trim(),
      code: values.code.trim(),
      sort: values.sort,
      status: Number(values.status),
      remark: values.remark?.trim() || undefined,
    }

    if (isEdit) {
      await update.mutateAsync({ ...dto, id: roleId })
    } else {
      await create.mutateAsync(dto)
    }

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

  const showLoading = isEdit && detailQuery.isLoading

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemRole.modal.editTitle' : 'systemRole.modal.createTitle')}
      width={600}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={isSubmitting}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      mask={{ closable: false }}
    >
      {showLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin description={t('systemRole.modal.loading')} />
        </div>
      ) : (
        <Form
          form={form}
          autoComplete="off"
          layout="vertical"
          initialValues={isEdit ? undefined : { status: String(ROLE_STATUS.ENABLED) }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('systemRole.form.name')}
                rules={[
                  { required: true, message: t('systemRole.form.nameRequired') },
                  { max: 30, message: t('systemRole.form.nameLength') },
                ]}
              >
                <Input placeholder={t('systemRole.form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label={t('systemRole.form.code')}
                rules={[
                  { required: true, message: t('systemRole.form.codeRequired') },
                  { max: 100, message: t('systemRole.form.codeLength') },
                ]}
              >
                <Input placeholder={t('systemRole.form.codePlaceholder')} disabled={isEdit} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sort"
                label={t('systemRole.form.sort')}
                rules={[{ required: true, message: t('systemRole.form.sortRequired') }]}
              >
                <InputNumber
                  placeholder={t('systemRole.form.sortPlaceholder')}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('systemRole.form.status')}
                rules={[{ required: true, message: t('systemRole.form.statusRequired') }]}
              >
                <DictSelect
                  dictType={ROLE_DICT_TYPES.status}
                  placeholder={t('systemRole.form.status')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item
                name="remark"
                label={t('systemRole.form.remark')}
                rules={[{ max: 500, message: t('systemRole.form.remarkLength') }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={t('systemRole.form.remark')}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}
    </Modal>
  )
}
