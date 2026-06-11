import { Select, type SelectProps } from 'antd'
import { useDictData } from '@/shared/hooks/use-dict-data'

interface DictSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  /** Dict type from BE seed, e.g. "common_status", "user_sex". */
  dictType: string
}

/**
 * antd Select pre-filled with dict items for the given `dictType`.
 *
 * Forwards all standard Select props (value, onChange, allowClear, placeholder,
 * mode="multiple", etc.). Works inside antd Form.Item without extra wiring:
 *
 * ```tsx
 *   <Form.Item name="status" label="Status">
 *     <DictSelect dictType="common_status" allowClear />
 *   </Form.Item>
 * ```
 *
 * Note on value type: BE returns `value` as a string. The Select's controlled
 * value will therefore be a string ("0", "1", etc.). When binding to numeric
 * BE fields (e.g., `status: Integer`), JSON request bodies still serialize as
 * strings — Spring Jackson coerces these back to integers on the BE.
 *
 * If a form needs strict numeric typing on the client side, use Form.Item's
 * `normalize`:  normalize: v => v == null ? v : Number(v)
 */
export function DictSelect({ dictType, ...rest }: DictSelectProps) {
  const { data, isLoading } = useDictData(dictType)
  const options = data.map(item => ({ value: item.value, label: item.label }))
  return <Select {...rest} options={options} loading={isLoading} />
}
