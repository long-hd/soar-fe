import { Select, type SelectProps } from 'antd'

import { useUserSimpleList } from '@/shared/hooks/use-user-simple-list'

type UserSelectProps = Omit<SelectProps, 'options' | 'loading'>

/**
 * antd Select pre-filled with the enabled user simple list.
 *
 * Single-select by default. Label = nickname (BE UserSimpleRespDTO has no username).
 *
 * ```tsx
 *   <Form.Item name="leaderUserId" label="Leader">
 *     <UserSelect allowClear placeholder="Select leader" />
 *   </Form.Item>
 * ```
 */
export function UserSelect(props: UserSelectProps) {
  const { data, isLoading } = useUserSimpleList()
  const options = data.map(item => ({ value: item.id, label: item.nickname }))
  return (
    <Select showSearch optionFilterProp="label" {...props} options={options} loading={isLoading} />
  )
}
