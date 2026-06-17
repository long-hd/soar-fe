import { Button, DatePicker, Form, Input, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

import type { FileFilters } from '@/features/infra/file/types'

interface SearchFormValues {
  name?: string
  type?: string
  createTime?: [Dayjs, Dayjs]
}

interface FileSearchFormProps {
  onSearch: (filters: FileFilters) => void
  onReset: () => void
  loading?: boolean
}

export function FileSearchForm({ onSearch, onReset, loading }: FileSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: FileFilters = {
      name: values.name?.trim() || undefined,
      type: values.type?.trim() || undefined,
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
      <Form.Item name="name" label={t('infraFile.search.name')}>
        <Input placeholder={t('infraFile.search.name')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="type" label={t('infraFile.search.type')}>
        <Input placeholder={t('infraFile.search.type')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="createTime" label={t('infraFile.search.createTime')}>
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
