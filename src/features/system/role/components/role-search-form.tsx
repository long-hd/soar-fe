import { Button, DatePicker, Form, Input, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'
import { ROLE_DICT_TYPES } from '@/features/system/role/constants'
import type { RoleFilters } from '@/features/system/role/types'

interface SearchFormValues {
  name?: string
  code?: string
  status?: string
  createTime?: [Dayjs, Dayjs]
}

interface RoleSearchFormProps {
  onSearch: (filters: RoleFilters) => void
  onReset: () => void
  loading?: boolean
}

export function RoleSearchForm({ onSearch, onReset, loading }: RoleSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: RoleFilters = {
      name: values.name?.trim() || undefined,
      code: values.code?.trim() || undefined,
      status: values.status == null || values.status === '' ? undefined : Number(values.status),
      createTime: values.createTime
        ? [
            values.createTime[0]?.startOf('day').toISOString(),
            values.createTime[1]?.endOf('day').toISOString(),
          ]
        : undefined,
    }
    onSearch(filters)
  }

  const handleReset = () => {
    form.resetFields()
    onReset()
  }

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={handleFinish}
      style={{ marginBottom: 16, rowGap: 16, flexWrap: 'wrap' }}
    >
      <Form.Item name="name" label={t('systemRole.search.name')}>
        <Input placeholder={t('systemRole.search.name')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="code" label={t('systemRole.search.code')}>
        <Input placeholder={t('systemRole.search.code')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="status" label={t('systemRole.search.status')}>
        <DictSelect
          dictType={ROLE_DICT_TYPES.status}
          allowClear
          placeholder={t('systemRole.search.status')}
          style={{ width: 140 }}
        />
      </Form.Item>

      <Form.Item name="createTime" label={t('systemRole.search.createTime')}>
        <DatePicker.RangePicker style={{ width: 260 }} />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('common.search')}
          </Button>
          <Button onClick={handleReset}>{t('common.reset')}</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
