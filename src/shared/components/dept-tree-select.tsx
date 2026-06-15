import { TreeSelect, type TreeSelectProps } from 'antd'
import { useMemo } from 'react'
import { useDeptTree } from '@/shared/hooks/use-dept-tree'
import type { DeptSimpleDTO } from '@/shared/api/lookup/dept'
import type { TreeNode } from '@/shared/lib/tree'

/**
 * antd TreeSelect pre-filled with the dept tree.
 *
 * Forwards all standard TreeSelect props (value, onChange, allowClear, multiple,
 * placeholder, etc.). Works inside antd Form.Item without extra wiring:
 *
 * ```tsx
 *   <Form.Item name="deptId" label="Department">
 *     <DeptTreeSelect allowClear placeholder="Select dept" />
 *   </Form.Item>
 * ```
 *
 * Sensible defaults applied (overridable):
 *  - `showSearch` enabled
 *  - `treeNodeFilterProp="title"` — typing filters by dept name
 *  - `treeDefaultExpandAll` — expand all by default (dept trees are typically shallow)
 *
 * Value type: numeric dept id (BE Long → JS number). Single value by default.
 * Pass `multiple` prop for multi-select where it makes sense (e.g., data-permission
 * "user can access these depts").
 */

type DeptTreeSelectProps = Omit<TreeSelectProps, 'treeData' | 'loading'> & {
  /** Node ids that cannot be selected (e.g. self + descendants in dept edit form). */
  disabledIds?: number[]
  loading?: boolean
}

type DeptTreeSelectNode = NonNullable<TreeSelectProps['treeData']>[number]

function toTreeData(
  items: TreeNode<DeptSimpleDTO>[],
  disabledIds?: number[],
): DeptTreeSelectNode[] {
  return items.map(item => ({
    title: item.name,
    value: item.id,
    disabled: disabledIds?.includes(item.id),
    children: item.children?.length ? toTreeData(item.children, disabledIds) : undefined,
  }))
}

export function DeptTreeSelect({
  disabledIds,
  loading: loadingOverride,
  ...props
}: DeptTreeSelectProps) {
  const { data: tree, isLoading } = useDeptTree()
  const treeData = useMemo(() => toTreeData(tree, disabledIds), [tree, disabledIds])

  return (
    <TreeSelect
      showSearch={{
        treeNodeFilterProp: 'title',
      }}
      treeDefaultExpandAll
      {...props}
      treeData={treeData}
      loading={isLoading || !!loadingOverride}
    />
  )
}
