import { Button, Card, Form, Input, Typography, message as antdMessage } from 'antd'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { login, selectAuthStatus, selectIsAuthed } from '@/app/slices/auth-slice'
import BlankLayout from '@/layouts/blank-layout'
import type { AuthLoginReqDTO } from '@/features/auth/types'

/**
 * Login page.
 *
 * Redirect logic:
 *  - On mount: if already authed (e.g., user navigates to /login while logged
 *    in), redirect immediately to `?redirect=<target>` if present else `/`.
 *  - On submit success: navigate(redirect ?? '/', { replace: true }).
 *
 * `decodeURIComponent` mirrors the `encodeURIComponent` in AuthGuard — keeps
 * the redirect URL roundtrip clean.
 *
 * Pattern from legacy `permission.ts:84-89` — adapted to react-router-dom.
 */
export default function LoginPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const status = useAppSelector(selectAuthStatus)
  const isAuthed = useAppSelector(selectIsAuthed)
  const [form] = Form.useForm<AuthLoginReqDTO>()

  // Already authed → bounce to target
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
