import { Button, Card, Form, Input, Typography, message as antdMessage } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { login, selectAuthStatus } from '@/app/slices/auth-slice'
import BlankLayout from '@/layouts/blank-layout'
import type { AuthLoginReqDTO } from '@/features/auth/types'

/**
 * Login page — antd Form, username + password.
 *
 * On submit: dispatch `login` thunk. On success, main.tsx conditional
 * render reacts to `isAuthed=true` and swaps to the placeholder (will
 * become the AppShell after C1).
 *
 * On failure: antd `message.error` toast with msg from the thunk's
 * rejectValue. Form stays mounted, user can retry.
 *
 * Validation: antd Form `rules`.
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectAuthStatus)
  const [form] = Form.useForm<AuthLoginReqDTO>()

  const onFinish = async (values: AuthLoginReqDTO) => {
    try {
      await dispatch(login(values)).unwrap()
      // Success path: isAuthed becomes true, main.tsx swaps render.
      // Nothing more to do here.
    } catch (rejectedMsg) {
      antdMessage.error(typeof rejectedMsg === 'string' ? rejectedMsg : t('login.failed'))
    }
  }

  return (
    <BlankLayout>
      <Card>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          {t('login.title')}
        </Typography.Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          // Dev convenience — pre-fills creds. Remove for production builds.
          initialValues={{ username: 'admin', password: 'admin123' }}
        >
          <Form.Item
            label={t('login.username')}
            name="username"
            rules={[{ required: true, message: t('login.usernameRequired') }]}
          >
            <Input autoComplete="username" autoFocus />
          </Form.Item>

          <Form.Item
            label={t('login.password')}
            name="password"
            rules={[{ required: true, message: t('login.passwordRequired') }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={status === 'authenticating'}>
              {t('login.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </BlankLayout>
  )
}
