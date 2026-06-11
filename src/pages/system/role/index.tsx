import { Card, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * Phase 5A placeholder for Role Management page.
 * Full CRUD implementation in Phase 5B (per crud-page skill template).
 *
 * Dispatched by tab-renderer when URL = `/?tab=system-role`.
 */
export default function SystemRolePage() {
  const { t } = useTranslation()

  return (
    <Card>
      <Typography.Title level={3}>Role Management</Typography.Title>
      <Typography.Paragraph type="secondary">
        Phase 5A placeholder — dispatched from <code>menu.component = system/role/index</code>.
      </Typography.Paragraph>
      <Typography.Paragraph>
        Full CRUD (search form, table, create/edit modal, permission-gated buttons) in Phase 5B. See{' '}
        <code>skills/crud-page.md</code>.
      </Typography.Paragraph>
      <Typography.Text type="secondary">{t('common.loading')}</Typography.Text>
    </Card>
  )
}
