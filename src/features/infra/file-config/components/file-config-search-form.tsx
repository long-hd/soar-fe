import { Button, DatePicker, Form, Input, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

import { FILE_CONFIG_DICT_TYPES } from '@/features/infra/file-config/constants'
import type { FileConfigFilters } from '@/features/infra/file-config/types'
import { DictSelect } from '@/shared/components/dict-select'

interface SearchFormValues {
  name?: string
  storage?: string
  createTime?: [Dayjs, Dayjs]
}

interface FileConfigSearchFormProps {
  onSearch: (filters: FileConfigFilters) => void
  onReset: () => void
  loading?: boolean
}

export function FileConfigSearchForm({ onSearch, onReset, loading }: FileConfigSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: FileConfigFilters = {
      name: values.name?.trim() || undefined,
      storage: values.storage == null || values.storage === '' ? undefined : Number(values.storage),
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
      <Form.Item name="name" label={t('infraFileConfig.search.name')}>
        <Input placeholder={t('infraFileConfig.search.name')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="storage" label={t('infraFileConfig.search.storage')}>
        <DictSelect
          dictType={FILE_CONFIG_DICT_TYPES.storage}
          allowClear
          placeholder={t('infraFileConfig.search.storage')}
          style={{ width: 160 }}
        />
      </Form.Item>

      <Form.Item name="createTime" label={t('infraFileConfig.search.createTime')}>
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
