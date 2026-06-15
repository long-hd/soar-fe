import { App, Col, Form, Input, Modal, Row, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { DICT_TYPE_DICT_TYPES, DictTypeStatus } from '../constants'
import type { DictTypeSaveReqDTO } from '../types'
import { useDictTypeDetailQuery, useDictTypeMutations } from '../hooks'

interface DictTypeFormModalProps {
  open: boolean
  /** undefined = create, set = edit */
  id?: number
  onClose: () => void
}

interface FormValues {
  name: string
  type: string
  status: string
  remark?: string
}

export function DictTypeFormModal({ open, id, onClose }: DictTypeFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = id != null

  const { create, update } = useDictTypeMutations()
  const detailQuery = useDictTypeDetailQuery(id, { enabled: open && isEdit })

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  useEffect(() => {
    if (!open || !detailQuery.data) return
    const d = detailQuery.data
    form.setFieldsValue({
      name: d.name,
      type: d.type,
      status: String(d.status),
      remark: d.remark,
    })
  }, [open, detailQuery.data, form])

  const isSubmitting = create.isPending || update.isPending

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const dto: DictTypeSaveReqDTO = {
      name: values.name.trim(),
      type: values.type.trim(),
      status: Number(values.status),
      remark: values.remark?.trim() || undefined,
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
      title: t('systemDictType.modal.discardChanges'),
      okText: t('systemDictType.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  const showLoading = isEdit && detailQuery.isLoading

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemDictType.modal.editTitle' : 'systemDictType.modal.createTitle')}
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
          <Spin description={t('systemDictType.modal.loading')} />
        </div>
      ) : (
        <Form
          form={form}
          autoComplete="off"
          layout="vertical"
          initialValues={isEdit ? undefined : { status: String(DictTypeStatus.ENABLED) }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('systemDictType.form.name')}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t('systemDictType.form.nameRequired'),
                  },
                  { max: 100, message: t('systemDictType.form.nameLength') },
                ]}
              >
                <Input placeholder={t('systemDictType.form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label={t('systemDictType.form.type')}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t('systemDictType.form.typeRequired'),
                  },
                  { max: 100, message: t('systemDictType.form.typeLength') },
                ]}
              >
                <Input placeholder={t('systemDictType.form.typePlaceholder')} disabled={isEdit} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('systemDictType.form.status')}
                rules={[{ required: true, message: t('systemDictType.form.statusRequired') }]}
              >
                <DictSelect
                  dictType={DICT_TYPE_DICT_TYPES.status}
                  placeholder={t('systemDictType.form.status')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item
                name="remark"
                label={t('systemDictType.form.remark')}
                rules={[{ max: 500, message: t('systemDictType.form.remarkLength') }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={t('systemDictType.form.remark')}
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
