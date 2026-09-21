import type { TreeNode } from './types'

/**
 * Возвращает КОПИЮ дерева, где у свёрнутых узлов дети убраны из раскладки.
 *
 * Важно: исходные данные не изменяются. Старая версия библиотеки писала
 * `node.children = null` прямо в объект пользователя — из-за этого ломался
 * реактивный пересчёт и «терялись» ветки. Здесь такого нет.
 */
export function applyCollapsed<T>(roots: TreeNode<T>[], collapsedIds: ReadonlySet<string>): TreeNode<T>[] {
  if (collapsedIds.size === 0) return roots

  function walk(node: TreeNode<T>): TreeNode<T> {
    const collapsed = collapsedIds.has(node.id)
    return {
      ...node,
      collapsed,
      children: collapsed ? [] : node.children.map(walk),
    }
  }

  return roots.map(walk)
}

/** Возвращает новое множество свёрнутых узлов: был свёрнут — развернём, и наоборот. */
export function toggleCollapsed(collapsedIds: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(collapsedIds)
  if (!next.delete(id)) next.add(id)
  return next
}
