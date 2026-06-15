import { App, Col, Form, Input, InputNumber, Modal, Row, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { POST_DICT_TYPES, POST_STATUS } from '../constants'
import type { PostSaveReqDTO } from '../types'
import { usePostDetailQuery, usePostMutations } from '../hooks'

/**
 * Create + edit modal — single component, mode chosen via `postId` prop.
 *
 * Edit mode (postId set):
 *   - Fires `postApi.get(postId)` via useQuery to fetch fresh data.
 *   - `code` field disabled — post code is the immutable identifier.
 *
 * Create mode (postId undefined):
 *   - Empty form with `status` pre-filled to ENABLED.
 *
 * Form value shape diverges from `PostSaveReqDTO` for dict-typed `status`:
 *   - Held as string in form (DictSelect emit) → converted to number at submit.
 */

interface PostFormModalProps {
  open: boolean
  /** undefined = create mode, set = edit mode for that post id. */
  postId?: number
  onClose: () => void
}

interface FormValues {
  name: string
  code: string
  sort: number
  status: string
  remark?: string
}

export function PostFormModal({ open, postId, onClose }: PostFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = postId != null

  const { create, update } = usePostMutations()
  const detailQuery = usePostDetailQuery(postId, { enabled: open && isEdit })

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  useEffect(() => {
    if (!open || !detailQuery.data) return
    const post = detailQuery.data
    form.setFieldsValue({
      name: post.name,
      code: post.code,
      sort: post.sort,
      status: String(post.status),
      remark: post.remark,
    })
  }, [open, detailQuery.data, form])

  const isSubmitting = create.isPending || update.isPending

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const dto: PostSaveReqDTO = {
      name: values.name.trim(),
      code: values.code.trim(),
      sort: values.sort,
      status: Number(values.status),
      remark: values.remark?.trim() || undefined,
    }

    if (isEdit) {
      await update.mutateAsync({ ...dto, id: postId })
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
      title: t('systemPost.modal.discardChanges'),
      okText: t('systemPost.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  const showLoading = isEdit && detailQuery.isLoading

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemPost.modal.editTitle' : 'systemPost.modal.createTitle')}
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
          <Spin description={t('systemPost.modal.loading')} />
        </div>
      ) : (
        <Form
          form={form}
          autoComplete="off"
          layout="vertical"
          initialValues={isEdit ? undefined : { status: String(POST_STATUS.ENABLED) }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('systemPost.form.name')}
                rules={[
                  { required: true, message: t('systemPost.form.nameRequired') },
                  { max: 50, message: t('systemPost.form.nameLength') },
                ]}
              >
                <Input placeholder={t('systemPost.form.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label={t('systemPost.form.code')}
                rules={[
                  { required: true, message: t('systemPost.form.codeRequired') },
                  { max: 64, message: t('systemPost.form.codeLength') },
                ]}
              >
                <Input placeholder={t('systemPost.form.codePlaceholder')} disabled={isEdit} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sort"
                label={t('systemPost.form.sort')}
                rules={[{ required: true, message: t('systemPost.form.sortRequired') }]}
              >
                <InputNumber
                  placeholder={t('systemPost.form.sortPlaceholder')}
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('systemPost.form.status')}
                rules={[{ required: true, message: t('systemPost.form.statusRequired') }]}
              >
                <DictSelect
                  dictType={POST_DICT_TYPES.status}
                  placeholder={t('systemPost.form.status')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item
                name="remark"
                label={t('systemPost.form.remark')}
                rules={[{ max: 500, message: t('systemPost.form.remarkLength') }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={t('systemPost.form.remark')}
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
