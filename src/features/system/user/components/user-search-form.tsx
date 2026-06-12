import { Button, DatePicker, Form, Input, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { DeptTreeSelect } from '@/shared/components/dept-tree-select'
import { DictSelect } from '@/shared/components/dict-select'
import { USER_DICT_TYPES } from '@/features/system/user/constants'
import type { UserFilters } from '@/features/system/user/types'

/**
 * User search form — 5 inline fields
 *
 * Form value shape (`SearchFormValues`) is intentionally INTERNAL to this
 * component — uses Dayjs for the RangePicker. The form converts to domain
 * shape (`UserFilters` with ISO Instant tuple) on submit, so the parent
 * never deals with Dayjs.
 *
 * Empty strings stripped to undefined to avoid sending `username=` etc.
 * (BE treats empty string as "match empty", not "no filter").
 */

interface SearchFormValues {
  username?: string
  mobile?: string
  status?: number
  deptId?: number
  createTime?: [Dayjs, Dayjs]
}

interface UserSearchFormProps {
  onSearch: (filters: UserFilters) => void
  onReset: () => void
  loading?: boolean
}

export function UserSearchForm({ onSearch, onReset, loading }: UserSearchFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm<SearchFormValues>()

  const handleFinish = (values: SearchFormValues) => {
    const filters: UserFilters = {
      username: values.username?.trim() || undefined,
      mobile: values.mobile?.trim() || undefined,
      status: values.status,
      deptId: values.deptId,
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
      <Form.Item name="username" label={t('systemUser.search.username')}>
        <Input placeholder={t('systemUser.search.username')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="mobile" label={t('systemUser.search.mobile')}>
        <Input placeholder={t('systemUser.search.mobile')} allowClear style={{ width: 180 }} />
      </Form.Item>

      <Form.Item name="status" label={t('systemUser.search.status')}>
        <DictSelect
          dictType={USER_DICT_TYPES.status}
          allowClear
          placeholder={t('systemUser.search.status')}
          style={{ width: 140 }}
        />
      </Form.Item>

      <Form.Item name="deptId" label={t('systemUser.search.deptId')}>
        <DeptTreeSelect
          allowClear
          placeholder={t('systemUser.search.deptId')}
          style={{ width: 220 }}
        />
      </Form.Item>

      <Form.Item name="createTime" label={t('systemUser.search.createTime')}>
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
