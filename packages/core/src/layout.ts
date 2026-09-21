import { resolveOptions } from './defaults'
import { buildLinks } from './links'
import type { Layout, LayoutNode, TreeNode, TreeViewOptions } from './types'

/**
 * Раскладка работает в двух «своих» осях, чтобы не писать четыре варианта кода:
 *  - along  — ось роста дерева (глубина): уровень 0, уровень 1, ...
 *  - across — ось поперёк уровня: соседи стоят здесь друг за другом.
 * В самом конце пара (along, across) превращается в привычные (x, y).
 */
interface Axis {
  vertical: boolean
  /** Размер карточки вдоль оси роста. */
  alongSize: number
  /** Размер карточки поперёк оси роста. */
  acrossSize: number
  /** Шаг между уровнями (размер + зазор). */
  alongStep: number
  /** Шаг между соседями (размер + зазор). */
  acrossStep: number
}

function getAxis(options: TreeViewOptions): Axis {
  const vertical = options.direction === 'top-to-bottom' || options.direction === 'bottom-to-top'
  const alongSize = vertical ? options.nodeHeight : options.nodeWidth
  const acrossSize = vertical ? options.nodeWidth : options.nodeHeight

  return {
    vertical,
    alongSize,
    acrossSize,
    alongStep: alongSize + options.levelGap,
    acrossStep: acrossSize + options.siblingGap,
  }
}

/**
 * Считает позицию каждого узла поперёк уровня («номер колонки»).
 *
 * Правило всего одно и его легко проверить руками:
 *  - лист встаёт в следующую свободную колонку (0, 1, 2, ...);
 *  - родитель встаёт ровно посередине между первым и последним ребёнком.
 *
 * Поэтому соседние ветки никогда не накладываются друг на друга.
 */
export function assignOrders<T>(roots: TreeNode<T>[]): {
  orders: Map<string, number>
  maxOrder: number
  maxDepth: number
} {
  const orders = new Map<string, number>()
  let nextLeafOrder = 0
  let maxDepth = 0

  function place(node: TreeNode<T>): number {
    if (node.depth > maxDepth) maxDepth = node.depth

    if (node.children.length === 0) {
      const order = nextLeafOrder
      nextLeafOrder += 1
      orders.set(node.id, order)
      return order
    }

    const childOrders = node.children.map(place)
    const order = (childOrders[0]! + childOrders[childOrders.length - 1]!) / 2
    orders.set(node.id, order)
    return order
  }

  roots.forEach(place)

  return { orders, maxOrder: Math.max(0, nextLeafOrder - 1), maxDepth }
}

/** Разворачивает дерево в плоский массив (порядок — «сверху вниз», как в данных). */
export function flatten<T>(roots: TreeNode<T>[]): TreeNode<T>[] {
  const result: TreeNode<T>[] = []

  function walk(node: TreeNode<T>): void {
    result.push(node)
    node.children.forEach(walk)
  }

  roots.forEach(walk)
  return result
}

/**
 * Главная функция раскладки: из дерева делает координаты и линии.
 * Чистая — одни и те же данные всегда дают один и тот же результат.
 */
export function layoutTree<T>(roots: TreeNode<T>[], options?: Partial<TreeViewOptions>): Layout<T> {
  const resolved = resolveOptions(options)
  const axis = getAxis(resolved)

  if (roots.length === 0) {
    return { nodes: [], links: [], width: 0, height: 0 }
  }

  const { orders, maxOrder, maxDepth } = assignOrders(roots)

  // Габариты содержимого: последний уровень + последняя колонка.
  const alongExtent = maxDepth * axis.alongStep + axis.alongSize
  const acrossExtent = maxOrder * axis.acrossStep + axis.acrossSize
  // У «перевёрнутых» направлений уровень 0 должен оказаться в конце холста.
  const mirrored = resolved.direction === 'bottom-to-top' || resolved.direction === 'right-to-left'

  const nodes: LayoutNode<T>[] = flatten(roots).map((node) => {
    const along = node.depth * axis.alongStep
    const across = orders.get(node.id)! * axis.acrossStep
    const alongPosition = mirrored ? alongExtent - axis.alongSize - along : along

    return {
      id: node.id,
      data: node.data,
      depth: node.depth,
      parentId: node.parentId,
      x: axis.vertical ? across : alongPosition,
      y: axis.vertical ? alongPosition : across,
      width: resolved.nodeWidth,
      height: resolved.nodeHeight,
      hasChildren: node.hasChildren,
      collapsed: node.collapsed,
    }
  })

  return {
    nodes,
    links: buildLinks(nodes, resolved),
    width: axis.vertical ? acrossExtent : alongExtent,
    height: axis.vertical ? alongExtent : acrossExtent,
  }
}
