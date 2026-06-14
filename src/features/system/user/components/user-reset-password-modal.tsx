import { App, Form, Input, Modal } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { UserRespDTO } from '../types'
import { useUserMutations } from '@/features/system/user/hooks'

/**
 * Reset password modal — single-purpose form, admin sets a new password
 * for a target user.
 *
 * Two-field UX (Q T2.4.1=A):
 *  - "New password" + "Confirm password" — match validation prevents typo
 *    sending wrong credential to user.
 *
 * Validation rules align with BE (UserUpdatePasswordReqDTO password length).
 *
 * No list-query invalidation on success — password isn't a visible column.
 * (If audit log or "last password reset" column added later, revisit.)
 *
 * Layout: vertical (matches T2.3 layout refactor for label visibility).
 *
 * Form state lifecycle:
 *   - `Form.useForm()` instance persists in this component across opens.
 *   - `destroyOnHidden` destroys Form DOM but not the instance state.
 *   - Without reset on open, fields retain prior values (e.g., admin types
 *     password for user A then cancels → reopens for user B → fields still
 *     hold A's typed value). Fix: resetFields() on every open.
 */

interface UserResetPasswordModalProps {
  open: boolean
  /** User being reset. Null when modal closed (post-close cleanup). */
  user: UserRespDTO | null
  onClose: () => void
}

interface FormValues {
  newPassword: string
  confirmPassword: string
}

export function UserResetPasswordModal({ open, user, onClose }: UserResetPasswordModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const { updatePassword } = useUserMutations()

  // Reset on each open — no prior values should leak across resets for different users.
  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (!user) return
    await updatePassword.mutateAsync({ id: user.id, password: values.newPassword })
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

  return (
    <Modal
      open={open}
      title={user ? t('systemUser.resetPassword.title', { username: user.username }) : ''}
      width={420}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={updatePassword.isPending}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="newPassword"
          label={t('systemUser.resetPassword.newPassword')}
          rules={[
            {
              required: true,
              message: t('systemUser.resetPassword.newPasswordRequired'),
            },
            {
              min: 4,
              max: 20,
              message: t('systemUser.resetPassword.newPasswordLength'),
            },
          ]}
        >
          <Input.Password
            placeholder={t('systemUser.resetPassword.newPasswordPlaceholder')}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={t('systemUser.resetPassword.confirmPassword')}
          dependencies={['newPassword']}
          rules={[
            {
              required: true,
              message: t('systemUser.resetPassword.confirmPasswordRequired'),
            },
            ({ getFieldValue }) => ({
              validator(_rule, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(
                  new Error(t('systemUser.resetPassword.confirmPasswordMismatch')),
                )
              },
            }),
          ]}
        >
          <Input.Password
            placeholder={t('systemUser.resetPassword.confirmPasswordPlaceholder')}
            autoComplete="new-password"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
