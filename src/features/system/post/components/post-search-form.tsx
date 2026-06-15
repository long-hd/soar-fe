import { Button, Form, Input, Space } from 'antd'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'

import { POST_DICT_TYPES } from '../constants'
import type { PostFilters } from '../types'

interface SearchFormValues {
  code?: string
  name?: string
  status?: string
}

interface PostSearchFormProps {
  onSearch: (filters: PostFilters) => void
  onReset: () => void
  loading?: boolean
}

export function PostSearchForm({ onSearch, onReset, loading }: PostSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: PostFilters = {
      code: values.code?.trim() || undefined,
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
      <Form.Item name="code" label={t('systemPost.search.code')}>
        <Input placeholder={t('systemPost.search.code')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="name" label={t('systemPost.search.name')}>
        <Input placeholder={t('systemPost.search.name')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="status" label={t('systemPost.search.status')}>
        <DictSelect
          dictType={POST_DICT_TYPES.status}
          allowClear
          placeholder={t('systemPost.search.status')}
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
