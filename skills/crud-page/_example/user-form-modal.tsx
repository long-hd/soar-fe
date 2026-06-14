import { App, Col, Form, Input, Modal, Row, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { DeptTreeSelect } from '@/shared/components/dept-tree-select'
import { DictSelect } from '@/shared/components/dict-select'
import { PostSelect } from '@/shared/components/post-select'

import { USER_DICT_TYPES } from '../constants'
import type { UserSaveReqDTO } from '../types'
import { useUserDetailQuery, useUserMutations } from '@/features/system/user/hooks'

/**
 * Create + edit modal — single component, mode chosen via `userId` prop.
 *
 * Edit mode (userId set):
 *   - Fires `userApi.get(userId)` via useQuery to fetch fresh data (Q T2.3.1=A).
 *     Page row data may be stale or missing fields (postIds, sex).
 *   - Modal body shows Spin while loading; form renders once data resolves.
 *   - Password field hidden — BE ignores `password` when `id` is set.
 *   - Username field disabled — usernames are immutable in yudao convention.
 *
 * Create mode (userId undefined):
 *   - Empty form. Password field visible + required.
 *
 * Close:
 *   - X / ESC / click-outside / Cancel button → check `form.isFieldsTouched()`.
 *     If touched → confirm "Discard changes?". If clean → close silently.
 *
 * Form state lifecycle:
 *   - `Form.useForm()` instance lives in THIS component (not in modal DOM).
 *   - `destroyOnHidden` destroys Form JSX children on close but the form instance
 *     state persists across open cycles. Without explicit reset, opening Create
 *     after a prior Edit shows stale values.
 *   - Reset useEffect below clears on every open; detail useEffect repopulates
 *     for edit mode (depends on `open` so reopening same role refires).
 *
 * Form value shape diverges from `UserSaveReqDTO` for dict-typed fields:
 *   - `sex` held as string (DictSelect emit) → converted to number at submit.
 *   - Matches T2.2.1 "DictSelect tax" pattern (codified in skill template T2.5).
 */

interface UserFormModalProps {
  open: boolean
  /** undefined = create mode, set = edit mode for that user id. */
  userId?: number
  onClose: () => void
}

interface FormValues {
  username: string
  password?: string
  nickname: string
  deptId?: number
  postIds?: number[]
  email?: string
  mobile?: string
  sex?: string // string from DictSelect; converted at boundary
  remark?: string
}

export function UserFormModal({ open, userId, onClose }: UserFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = userId != null

  const { create, update } = useUserMutations()
  const detailQuery = useUserDetailQuery(userId, { enabled: open && isEdit })

  // Reset form on each open. Clears stale state from previous open cycle.
  // For Edit mode, the detail useEffect below repopulates from query data.
  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  // Populate form when modal opens in edit mode + detail arrives.
  // `open` is in deps so reopening the same userId (cached data, same reference)
  // still refires this effect → repopulates after the reset above.
  useEffect(() => {
    if (!open || !detailQuery.data) return
    const u = detailQuery.data
    form.setFieldsValue({
      username: u.username,
      nickname: u.nickname,
      deptId: u.deptId,
      postIds: u.postIds,
      email: u.email,
      mobile: u.mobile,
      // dict-typed → string for Select option matching
      sex: u.sex == null ? undefined : String(u.sex),
      remark: u.remark,
    })
  }, [open, detailQuery.data, form])

  // ===== Mutations =====

  const isSubmitting = create.isPending || update.isPending

  // ===== Handlers =====

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const dto: UserSaveReqDTO = {
      username: values.username,
      nickname: values.nickname,
      deptId: values.deptId,
      postIds: values.postIds,
      email: values.email?.trim() || undefined,
      mobile: values.mobile?.trim() || undefined,
      sex: values.sex == null || values.sex === '' ? undefined : Number(values.sex),
      remark: values.remark?.trim() || undefined,
    }

    if (isEdit) {
      await update.mutateAsync({ ...dto, id: userId })
    } else {
      await create.mutateAsync({ ...dto, password: values.password })
    }

    onClose()
  }

  const handleCancel = () => {
    if (!form.isFieldsTouched()) {
      onClose()
      return
    }
    appModal.confirm({
      title: t('systemUser.modal.discardChanges'),
      okText: t('systemUser.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  // ===== Render =====

  const showLoading = isEdit && detailQuery.isLoading

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemUser.modal.editTitle' : 'systemUser.modal.createTitle')}
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
          <Spin description={t('systemUser.modal.loading')} />
        </div>
      ) : (
        <Form form={form} autoComplete="off" layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label={t('systemUser.form.username')}
                rules={[
                  { required: true, message: t('systemUser.form.usernameRequired') },
                  { min: 4, max: 30, message: t('systemUser.form.usernameLength') },
                ]}
              >
                <Input placeholder={t('systemUser.form.usernamePlaceholder')} disabled={isEdit} />
              </Form.Item>
            </Col>
            {!isEdit && (
              <Col span={12}>
                <Form.Item
                  name="password"
                  label={t('systemUser.form.password')}
                  rules={[
                    { required: true, message: t('systemUser.form.passwordRequired') },
                    { min: 4, max: 20, message: t('systemUser.form.passwordLength') },
                  ]}
                >
                  <Input.Password
                    placeholder={t('systemUser.form.passwordPlaceholder')}
                    autoComplete="new-password"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nickname"
                label={t('systemUser.form.nickname')}
                rules={[{ required: true, message: t('systemUser.form.nicknameRequired') }]}
              >
                <Input placeholder={t('systemUser.form.nicknamePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sex" label={t('systemUser.form.sex')}>
                <DictSelect
                  dictType={USER_DICT_TYPES.sex}
                  allowClear
                  placeholder={t('systemUser.form.sex')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deptId" label={t('systemUser.form.deptId')}>
                <DeptTreeSelect allowClear placeholder={t('systemUser.form.deptId')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="postIds" label={t('systemUser.form.postIds')}>
                <PostSelect mode="multiple" allowClear placeholder={t('systemUser.form.postIds')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label={t('systemUser.form.email')}
                rules={[{ type: 'email', message: t('systemUser.form.emailInvalid') }]}
              >
                <Input placeholder={t('systemUser.form.email')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mobile" label={t('systemUser.form.mobile')}>
                <Input placeholder={t('systemUser.form.mobile')} />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item name="remark" label={t('systemUser.form.remark')}>
                <Input.TextArea
                  rows={3}
                  placeholder={t('systemUser.form.remark')}
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
