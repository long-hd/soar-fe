import { TreeSelect, type TreeSelectProps } from 'antd'
import { useMemo } from 'react'

import type { MenuSimpleDTO } from '@/shared/api/lookup/menu'
import { useMenuTree } from '@/shared/hooks/use-menu-tree'
import type { TreeNode } from '@/shared/lib/tree'

/** BE MenuTypeEnum.BUTTON — excluded from parent picker (not disabled, fully removed). */
const MENU_TYPE_BUTTON = 3

/**
 * antd TreeSelect pre-filled with the menu tree for parent selection.
 * BUTTON (type=3) nodes are filtered out recursively before render.
 */
type MenuTreeSelectProps = Omit<TreeSelectProps, 'treeData' | 'loading'> & {
  /** Node ids that cannot be selected (e.g. self + descendants in edit form). */
  disabledIds?: number[]
  loading?: boolean
}

type MenuTreeSelectNode = NonNullable<TreeSelectProps['treeData']>[number]

function filterButtonNodes(items: TreeNode<MenuSimpleDTO>[]): TreeNode<MenuSimpleDTO>[] {
  return items
    .filter(item => item.type !== MENU_TYPE_BUTTON)
    .map(item => ({
      ...item,
      children: item.children?.length ? filterButtonNodes(item.children) : undefined,
    }))
}

function toTreeData(
  items: TreeNode<MenuSimpleDTO>[],
  disabledIds?: number[],
): MenuTreeSelectNode[] {
  return items.map(item => ({
    title: item.name,
    value: item.id,
    disabled: disabledIds?.includes(item.id),
    children: item.children?.length ? toTreeData(item.children, disabledIds) : undefined,
  }))
}

export function MenuTreeSelect({
  disabledIds,
  loading: loadingOverride,
  ...props
}: MenuTreeSelectProps) {
  const { data: rawTree, isLoading } = useMenuTree()
  const treeData = useMemo(() => {
    const filtered = filterButtonNodes(rawTree)
    return toTreeData(filtered, disabledIds)
  }, [rawTree, disabledIds])

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
