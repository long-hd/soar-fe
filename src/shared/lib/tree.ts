/**
 * Generic flat-list → tree builder.
 *
 * Used by:
 *  - dept (A3) — Hierarchical organization
 *  - menu admin (port loop) — Menu items have parentId
 *  - Future: region, area, category, any hierarchical entity
 *
 * legacy reference: `src/utils/tree.ts > handleTree()`. Same idea, more type-safe API.
 *
 * Root detection rule:
 *  - parentId is null/undefined -> root
 *  - parentId refers to an item NOT in the list -> root (defensive: orphans become roots)
 *  - parentId === 0 -> typically becomes "orphan -> root" since no item has id=0
 *    (matches legacy convention without needing a special-case param)
 *  - parentId refers to a known item -> child of that item
 *
 * Items are SHALLOW-CLONED before adding `children` to avoid mutating the input array.
 * Sort order within each level is preserved from the input.
 */

export type TreeNode<T> = T & { children?: TreeNode<T>[] }

export interface BuildTreeOptions<T> {
  /**
   * The function to get the id of an item.
   */
  getId: (item: T) => string | number
  /**
   * The function to get the parent id of an item.
   */
  getParentId: (item: T) => string | number | null | undefined
}

/**
 * Build a tree from a flat list of items.
 *
 * @param items - The flat list of items to build the tree from.
 * @param options - The options for building the tree.
 * @returns The tree built from the flat list.
 */
export function buildTreeFromFlat<T>(
  items: readonly T[],
  options: BuildTreeOptions<T>,
): TreeNode<T>[] {
  const { getId, getParentId } = options

  // First pass: shallow-clone each item, index by id.
  const map = new Map<string | number, TreeNode<T>>()
  for (const item of items) {
    map.set(getId(item), { ...item } as TreeNode<T>)
  }

  // Second pass: attach to parent or push as root.
  const roots: TreeNode<T>[] = []
  for (const item of items) {
    const node = map.get(getId(item))!
    const parentId = getParentId(item)

    if (parentId == null) {
      roots.push(node)
      continue
    }

    const parent = map.get(parentId)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(node)
    } else {
      // Orphan (parentId not in map) or root (parentId === 0 with no id=0 in data).
      roots.push(node)
    }
  }

  return roots
}
