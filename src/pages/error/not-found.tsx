import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BlankLayout from '@/layouts/blank-layout'

/**
 * 404 page — catch-all route `*` lands here.
 *
 * Note: invalid `?tab=` keys are NOT routed here — they stay at `/`
 * and render a "Coming soon" fallback inside the content area
 */
export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <BlankLayout>
      <Result
        status="404"
        title="404"
        subTitle={t('error.notFound')}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            {t('common.backToHome')}
          </Button>
        }
      />
    </BlankLayout>
  )
}
