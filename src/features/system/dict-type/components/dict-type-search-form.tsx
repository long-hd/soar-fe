import { Button, DatePicker, Form, Input, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { DICT_TYPE_DICT_TYPES } from '../constants'
import type { DictTypeFilters } from '../types'

interface SearchFormValues {
  name?: string
  type?: string
  status?: string
  createTime?: [Dayjs, Dayjs]
}

interface DictTypeSearchFormProps {
  onSearch: (filters: DictTypeFilters) => void
  onReset: () => void
  loading?: boolean
}

export function DictTypeSearchForm({ onSearch, onReset, loading }: DictTypeSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: DictTypeFilters = {
      name: values.name?.trim() || undefined,
      type: values.type?.trim() || undefined,
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
      <Form.Item name="name" label={t('systemDictType.search.name')}>
        <Input placeholder={t('systemDictType.search.name')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="type" label={t('systemDictType.search.type')}>
        <Input placeholder={t('systemDictType.search.type')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="status" label={t('systemDictType.search.status')}>
        <DictSelect
          dictType={DICT_TYPE_DICT_TYPES.status}
          allowClear
          placeholder={t('systemDictType.search.status')}
          style={{ width: 140 }}
        />
      </Form.Item>

      <Form.Item name="createTime" label={t('systemDictType.search.createTime')}>
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
