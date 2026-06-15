import { Button, Form, Input, Space } from 'antd'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { DICT_DATA_DICT_TYPES } from '../constants'
import type { DictDataFilters } from '../types'

interface SearchFormValues {
  label?: string
  status?: string
}

interface DictDataSearchFormProps {
  onSearch: (filters: DictDataFilters) => void
  onReset: () => void
  loading?: boolean
}

export function DictDataSearchForm({ onSearch, onReset, loading }: DictDataSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: DictDataFilters = {
      label: values.label?.trim() || undefined,
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
      <Form.Item name="label" label={t('systemDictData.search.label')}>
        <Input placeholder={t('systemDictData.search.label')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="status" label={t('systemDictData.search.status')}>
        <DictSelect
          dictType={DICT_DATA_DICT_TYPES.status}
          allowClear
          placeholder={t('systemDictData.search.status')}
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
