import { App, Col, Form, Input, InputNumber, Modal, Row, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { ColorTypeSelect } from './color-type-select'
import { DICT_DATA_DICT_TYPES, DictDataStatus } from '../constants'
import type { DictDataSaveReqDTO } from '../types'
import { useDictDataDetailQuery, useDictDataMutations } from '../hooks'

interface DictDataFormModalProps {
  open: boolean
  /** undefined = create, set = edit */
  id?: number
  /** Parent dict type from URL — merged at submit, not shown in form. */
  dictType: string
  onClose: () => void
}

interface FormValues {
  sort: number
  label: string
  value: string
  status: string
  colorType?: string
  cssClass?: string
  remark?: string
}

export function DictDataFormModal({ open, id, dictType, onClose }: DictDataFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = id != null

  const { create, update } = useDictDataMutations()
  const detailQuery = useDictDataDetailQuery(id, { enabled: open && isEdit })

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  useEffect(() => {
    if (!open || !detailQuery.data) return
    const d = detailQuery.data
    form.setFieldsValue({
      sort: d.sort,
      label: d.label,
      value: d.value,
      status: String(d.status),
      colorType: d.colorType,
      cssClass: d.cssClass,
      remark: d.remark,
    })
  }, [open, detailQuery.data, form])

  const isSubmitting = create.isPending || update.isPending

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const dto: DictDataSaveReqDTO = {
      sort: values.sort,
      label: values.label.trim(),
      value: values.value.trim(),
      dictType,
      status: Number(values.status),
      colorType: values.colorType || undefined,
      cssClass: values.cssClass?.trim() || undefined,
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
      title: t('systemDictData.modal.discardChanges'),
      okText: t('systemDictData.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  const showLoading = isEdit && detailQuery.isLoading

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemDictData.modal.editTitle' : 'systemDictData.modal.createTitle')}
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
          <Spin description={t('systemDictData.modal.loading')} />
        </div>
      ) : (
        <Form
          form={form}
          autoComplete="off"
          layout="vertical"
          initialValues={isEdit ? undefined : { status: String(DictDataStatus.ENABLED), sort: 0 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sort"
                label={t('systemDictData.form.sort')}
                rules={[{ required: true, message: t('systemDictData.form.sortRequired') }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('systemDictData.form.status')}
                rules={[{ required: true, message: t('systemDictData.form.statusRequired') }]}
              >
                <DictSelect
                  dictType={DICT_DATA_DICT_TYPES.status}
                  placeholder={t('systemDictData.form.status')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="label"
                label={t('systemDictData.form.label')}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t('systemDictData.form.labelRequired'),
                  },
                  { max: 100, message: t('systemDictData.form.labelLength') },
                ]}
              >
                <Input placeholder={t('systemDictData.form.labelPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="value"
                label={t('systemDictData.form.value')}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t('systemDictData.form.valueRequired'),
                  },
                  { max: 100, message: t('systemDictData.form.valueLength') },
                ]}
              >
                <Input placeholder={t('systemDictData.form.valuePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="colorType" label={t('systemDictData.form.colorType')}>
                <ColorTypeSelect
                  allowClear
                  placeholder={t('systemDictData.form.colorTypePlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cssClass" label={t('systemDictData.form.cssClass')}>
                <Input placeholder={t('systemDictData.form.cssClassPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item
                name="remark"
                label={t('systemDictData.form.remark')}
                rules={[{ max: 500, message: t('systemDictData.form.remarkLength') }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={t('systemDictData.form.remark')}
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
