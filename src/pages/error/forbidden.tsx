import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BlankLayout from '@/layouts/blank-layout'

/**
 * 403 page — shown when user navigates to `/forbidden` (no current path
 * targets it directly in Phase 5A; reserved for future role-based denials).
 */
export default function ForbiddenPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <BlankLayout>
      <Result
        status="403"
        title="403"
        subTitle={t('error.forbidden')}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            {t('common.backToHome')}
          </Button>
        }
      />
    </BlankLayout>
  )
}
