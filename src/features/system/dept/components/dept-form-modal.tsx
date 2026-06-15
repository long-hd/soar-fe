import { App, Col, Form, Input, InputNumber, Modal, Row, Spin } from 'antd'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DeptTreeSelect } from '@/shared/components/dept-tree-select'
import { DictSelect } from '@/shared/components/dict-select'
import { UserSelect } from '@/shared/components/user-select'
import { buildTreeFromFlat, collectDescendantIds } from '@/shared/lib/tree'

import { DEPT_DICT_TYPES, DEPT_STATUS } from '../constants'
import { useDeptDetailQuery, useDeptFullListQuery, useDeptMutations } from '../hooks'
import type { DeptSaveReqDTO } from '../types'

interface DeptFormModalProps {
  open: boolean
  /** undefined = create mode, set = edit mode for that dept id. */
  id?: number
  /** Pre-set parent when creating a child department. */
  parentIdPreset?: number
  onClose: () => void
}

interface FormValues {
  name: string
  parentId?: number
  leaderUserId?: number
  sort: number
  phone?: string
  email?: string
  status: string
}

/**
 * Unified create + edit modal for departments.
 * Parent picker disables self + descendants in edit mode (requires unfiltered list query).
 */
export function DeptFormModal({ open, id, parentIdPreset, onClose }: DeptFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = id != null

  const { create, update } = useDeptMutations()
  const detailQuery = useDeptDetailQuery(id, { enabled: open && isEdit })

  const fullListQuery = useDeptFullListQuery({ enabled: open && isEdit })
  const fullFlatList = useMemo(() => fullListQuery.data ?? [], [fullListQuery.data])
  const parentPickerLocked = isEdit && fullListQuery.isLoading

  const disabledIds = useMemo(() => {
    if (!isEdit || id == null || fullFlatList.length === 0) return undefined
    const fullTree = buildTreeFromFlat(fullFlatList, {
      getId: d => d.id,
      getParentId: d => d.parentId,
    })
    return [id, ...collectDescendantIds(fullTree, id, d => d.id)]
  }, [isEdit, id, fullFlatList])

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  useEffect(() => {
    if (!open || !detailQuery.data) return
    const d = detailQuery.data
    form.setFieldsValue({
      name: d.name,
      parentId: d.parentId === 0 ? undefined : d.parentId,
      leaderUserId: d.leaderUserId,
      sort: d.sort,
      phone: d.phone,
      email: d.email,
      status: String(d.status),
    })
  }, [open, detailQuery.data, form])

  useEffect(() => {
    if (!open || isEdit) return
    if (parentIdPreset != null) {
      form.setFieldsValue({ parentId: parentIdPreset })
    }
  }, [open, isEdit, parentIdPreset, form])

  const isSubmitting = create.isPending || update.isPending

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const dto: DeptSaveReqDTO = {
      name: values.name.trim(),
      parentId: values.parentId ?? 0,
      sort: values.sort,
      status: Number(values.status),
      leaderUserId: values.leaderUserId,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
    }

    if (isEdit) {
      await update.mutateAsync({ ...dto, id })
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
      title: t('systemDept.modal.discardChanges'),
      okText: t('systemDept.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  const showLoading = isEdit && detailQuery.isLoading

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemDept.modal.editTitle' : 'systemDept.modal.createTitle')}
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
          <Spin description={t('systemDept.modal.loading')} />
        </div>
      ) : (
        <Form
          form={form}
          autoComplete="off"
          layout="vertical"
          initialValues={isEdit ? undefined : { status: String(DEPT_STATUS.ENABLED) }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('systemDept.form.name')}
                rules={[
                  { required: true, message: t('systemDept.form.nameRequired') },
                  { max: 30, message: t('systemDept.form.nameLength') },
                ]}
              >
                <Input placeholder={t('systemDept.form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parentId" label={t('systemDept.form.parentId')}>
                <DeptTreeSelect
                  allowClear
                  placeholder={t('systemDept.form.parentIdPlaceholder')}
                  disabledIds={disabledIds}
                  disabled={parentPickerLocked}
                  loading={parentPickerLocked}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="leaderUserId" label={t('systemDept.form.leaderUserId')}>
                <UserSelect allowClear placeholder={t('systemDept.form.leaderUserIdPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sort"
                label={t('systemDept.form.sort')}
                rules={[{ required: true, message: t('systemDept.form.sortRequired') }]}
              >
                <InputNumber
                  placeholder={t('systemDept.form.sortPlaceholder')}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={t('systemDept.form.phone')}
                rules={[{ max: 11, message: t('systemDept.form.phoneLength') }]}
              >
                <Input placeholder={t('systemDept.form.phonePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label={t('systemDept.form.email')}
                rules={[
                  { type: 'email', message: t('systemDept.form.emailInvalid') },
                  { max: 50, message: t('systemDept.form.emailLength') },
                ]}
              >
                <Input placeholder={t('systemDept.form.emailPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item
                name="status"
                label={t('systemDept.form.status')}
                rules={[{ required: true, message: t('systemDept.form.statusRequired') }]}
              >
                <DictSelect
                  dictType={DEPT_DICT_TYPES.status}
                  placeholder={t('systemDept.form.status')}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}
    </Modal>
  )
}
