import { Select, type SelectProps } from 'antd'
import { usePostList } from '@/shared/hooks/use-post-list'

type PostSelectProps = Omit<SelectProps, 'options' | 'loading'>

/**
 * antd Select pre-filled with the enabled post list.
 *
 * Default is single-select (matches legacy). Pass `mode="multiple"` for the user
 * form where multi-post assignment is the norm (User.postIds: Set<Long>).
 *
 * ```tsx
 *   // Single (rare — e.g. "primary post"):
 *   <Form.Item name="primaryPostId" label="Primary Post">
 *     <PostSelect allowClear placeholder="Select post" />
 *   </Form.Item>
 *
 *   // Multi (user form — typical):
 *   <Form.Item name="postIds" label="Posts">
 *     <PostSelect mode="multiple" allowClear placeholder="Assign posts" />
 *   </Form.Item>
 * ```
 *
 * Sensible defaults applied (overridable):
 *  - `showSearch` enabled
 *  - `optionFilterProp="label"` — typing filters by post name
 *
 * Value type: numeric post id(s) (BE Long → JS number). Single-mode value is `number`,
 * multi-mode value is `number[]`.
 */
export function PostSelect(props: PostSelectProps) {
  const { data, isLoading } = usePostList()
  const options = data.map(item => ({ value: item.id, label: item.name }))
  return (
    <Select showSearch optionFilterProp="label" {...props} options={options} loading={isLoading} />
  )
}
