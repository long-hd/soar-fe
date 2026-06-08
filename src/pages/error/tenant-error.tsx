import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * Full-screen blocking error when `getTenantByWebsite` returns null
 * or fails (network error, BE down). No way to bypass — user must
 * fix domain config or wait for BE recovery, then reload.
 *
 * May add a "Enter tenant name" form here (call
 * `getTenantIdByName` fallback). Currently blocks unconditionally.
 */
export default function TenantErrorPage() {
  const { t } = useTranslation()

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Result
        status="error"
        title={t('error.tenantNotFound')}
        subTitle={`Hostname: ${window.location.host}`}
        extra={
          <Button type="primary" onClick={handleRetry}>
            {t('common.refresh')}
          </Button>
        }
      />
    </div>
  )
}
