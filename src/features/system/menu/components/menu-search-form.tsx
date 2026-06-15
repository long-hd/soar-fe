import { Button, Form, Input, Space } from 'antd'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { MENU_DICT_TYPES } from '../constants'
import type { MenuFilters } from '../types'

interface SearchFormValues {
  name?: string
  status?: string
}

interface MenuSearchFormProps {
  onSearch: (filters: MenuFilters) => void
  onReset: () => void
  loading?: boolean
}

/**
 * Inline search form for menu tree list (name + status filters).
 */
export function MenuSearchForm({ onSearch, onReset, loading }: MenuSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: MenuFilters = {
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
      <Form.Item name="name" label={t('systemMenu.search.name')}>
        <Input placeholder={t('systemMenu.search.name')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="status" label={t('systemMenu.search.status')}>
        <DictSelect
          dictType={MENU_DICT_TYPES.status}
          allowClear
          placeholder={t('systemMenu.search.status')}
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
