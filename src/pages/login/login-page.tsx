import { App, Button, Card, Form, Input, Typography, theme } from 'antd'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { login, selectAuthStatus, selectIsAuthed } from '@/app/slices/auth-slice'
import BlankLayout from '@/layouts/blank-layout'
import type { AuthLoginReqDTO } from '@/features/auth/types'

/**
 * Login page.
 *
 * Polish:
 *  - Brand wordmark "Soar" above the card (primary color via theme token).
 *  - Subtitle "Admin Console".
 *  - Dev credentials pre-fill ONLY in dev mode (resolves tech debt #10).
 *    Production builds get empty form — Vite tree-shakes the dev branch.
 *
 * Redirect logic
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const status = useAppSelector(selectAuthStatus)
  const isAuthed = useAppSelector(selectIsAuthed)
  const [form] = Form.useForm<AuthLoginReqDTO>()
  const { message } = App.useApp()

  if (isAuthed) {
    const redirect = searchParams.get('redirect')
    const target = redirect ? decodeURIComponent(redirect) : '/'
    return <Navigate to={target} replace />
  }

  const onFinish = async (values: AuthLoginReqDTO) => {
    try {
      await dispatch(login(values)).unwrap()
      const redirect = searchParams.get('redirect')
      navigate(redirect ? decodeURIComponent(redirect) : '/', { replace: true })
    } catch (rejectedMsg) {
      message.error(typeof rejectedMsg === 'string' ? rejectedMsg : t('login.failed'))
    }
  }

  return (
    <BlankLayout>
      {/* Brand wordmark — above the card */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Typography.Title
          level={1}
          style={{
            color: token.colorPrimary,
            marginBottom: 4,
            letterSpacing: '0.08em',
            fontWeight: 700,
          }}
        >
          Soar
        </Typography.Title>
        <Typography.Text type="secondary">Admin Console</Typography.Text>
      </div>

      <Card>
        <Typography.Title level={4} style={{ textAlign: 'center', marginTop: 0, marginBottom: 24 }}>
          {t('login.title')}
        </Typography.Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          // Dev convenience — Vite tree-shakes in production builds
          initialValues={
            import.meta.env.DEV ? { username: 'admin', password: 'admin123' } : undefined
          }
        >
          <Form.Item
            label={t('login.username')}
            name="username"
            rules={[{ required: true, message: t('login.usernameRequired') }]}
          >
            <Input autoComplete="username" autoFocus size="large" />
          </Form.Item>

          <Form.Item
            label={t('login.password')}
            name="password"
            rules={[{ required: true, message: t('login.passwordRequired') }]}
          >
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={status === 'authenticating'}
            >
              {t('login.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </BlankLayout>
  )
}
