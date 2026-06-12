import type { PageResult } from '@/shared/api/types'
import { usePagedQuery } from '@/shared/hooks/use-paged-query'
import { useTableState } from '@/shared/hooks/use-table-state'
import { Button, Card, Table, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * Phase 5A placeholder for User Management page.
 * Full CRUD implementation in Phase 5B (per crud-page skill template).
 *
 * Dispatched by tab-renderer when URL = `/?tab=system-user`.
 */
export default function SystemUserPage() {
  const { t } = useTranslation()

  return (
    <Card>
      <Typography.Title level={3}>User Management</Typography.Title>
      <Typography.Paragraph type="secondary">
        Phase 5A placeholder — dispatched from <code>menu.component = system/user/index</code>.
      </Typography.Paragraph>
      <Typography.Paragraph>
        Full CRUD (search form, table, create/edit modal, permission-gated buttons) in Phase 5B. See{' '}
        <code>skills/crud-page.md</code>.
      </Typography.Paragraph>
      <Typography.Text type="secondary">{t('common.loading')}</Typography.Text>
      <TableSmoke />
    </Card>
  )
}

interface MockRow {
  id: number
  name: string
  status: number
}
interface MockFilters extends Record<string, unknown> {
  name?: string
}

const ALL_ROWS: MockRow[] = Array.from({ length: 47 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  status: i % 2,
}))

async function mockFetch(
  params: { pageNo: number; pageSize: number } & MockFilters,
): Promise<PageResult<MockRow>> {
  await new Promise(r => setTimeout(r, 300)) // simulate latency
  const filtered = params.name
    ? ALL_ROWS.filter(r => r.name.toLowerCase().includes(String(params.name).toLowerCase()))
    : ALL_ROWS
  const start = (params.pageNo - 1) * params.pageSize
  return { list: filtered.slice(start, start + params.pageSize), total: filtered.length }
}

function TableSmoke() {
  const ts = useTableState<MockFilters>()
  const { tableProps, total } = usePagedQuery({
    queryKey: ['mock'],
    queryFn: mockFetch,
    tableState: ts,
  })
  return (
    <div style={{ padding: 24 }}>
      <p>
        Page {ts.pageNo}, size {ts.pageSize}, total {total}, sort:{' '}
        {ts.sort ? `${ts.sort.field} ${ts.sort.order}` : 'none'}
      </p>
      <Button onClick={() => ts.setFilters({ name: 'Item 1' })}>Filter "Item 1"</Button>
      <Button onClick={() => ts.clearFilters()}>Clear</Button>
      <Table
        {...tableProps}
        rowKey="id"
        columns={[
          { title: 'ID', dataIndex: 'id', sorter: true },
          { title: 'Name', dataIndex: 'name', sorter: true },
          { title: 'Status', dataIndex: 'status' },
        ]}
      />
    </div>
  )
}
