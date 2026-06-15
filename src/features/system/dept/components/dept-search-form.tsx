import { Button, Form, Input, Space } from 'antd'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { DEPT_DICT_TYPES } from '../constants'
import type { DeptFilters } from '../types'

interface SearchFormValues {
  name?: string
  status?: string
}

interface DeptSearchFormProps {
  onSearch: (filters: DeptFilters) => void
  onReset: () => void
  loading?: boolean
}

/**
 * Inline search form for department tree list (name + status filters).
 */
export function DeptSearchForm({ onSearch, onReset, loading }: DeptSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: DeptFilters = {
      name: values.name?.trim() || undefined,
      status: values.status == null || values.status === '' ? undefined : Number(values.status),
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
      <Form.Item name="name" label={t('systemDept.search.name')}>
        <Input placeholder={t('systemDept.search.name')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="status" label={t('systemDept.search.status')}>
        <DictSelect
          dictType={DEPT_DICT_TYPES.status}
          allowClear
          placeholder={t('systemDept.search.status')}
          style={{ width: 140 }}
        />
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
