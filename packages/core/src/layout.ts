import { resolveOptions } from './defaults'
import { buildLinks } from './links'
import type { GapSize, Layout, LayoutNode, NodeSize, TreeNode, TreeViewOptions } from './types'

/**
 * Раскладка работает в двух «своих» осях, чтобы не писать четыре варианта кода:
 *  - along  — ось роста дерева (глубина): уровень 0, уровень 1, ...
 *  - across — ось поперёк уровня: соседи стоят здесь друг за другом.
 * В самом конце пара (along, across) превращается в привычные (x, y).
 */

/** Место узла на плоскости до того, как оси превратились в x/y. */
export interface Placement {
  depth: number
  /** Отступ от начала своего уровня. Заполняется во втором проходе. */
  along: number
  /** Отступ поперёк уровня. */
  across: number
  /** Размер карточки вдоль оси роста. */
  alongSize: number
  /** Размер карточки поперёк оси роста. */
  acrossSize: number
}

export interface Placements {
  byId: Map<string, Placement>
  /** Размер содержимого вдоль оси роста. */
  alongExtent: number
  /** Размер содержимого поперёк оси роста. */
  acrossExtent: number
}

/** Размер конкретного узла: число берём как есть, у функции — спрашиваем. */
function sizeOf<T>(size: NodeSize<T>, node: TreeNode<T>): number {
  return typeof size === 'function' ? size(node) : size
}

/** Отступ после конкретного узла. Функции сообщаем, сколько народу на уровне. */
function gapOf<T>(gap: GapSize<T>, node: TreeNode<T>, levelCount: number): number {
  return typeof gap === 'function' ? gap(node, levelCount) : gap
}

/** Сколько узлов на каждом уровне — это нужно `siblingGap`-функции. */
function countByDepth<T>(roots: TreeNode<T>[]): number[] {
  const counts: number[] = []

  for (const node of flatten(roots)) counts[node.depth] = (counts[node.depth] ?? 0) + 1

  return counts
}

/**
 * Второй проход, общий для обеих раскладок: толщина уровней уже известна,
 * остаётся расставить их друг за другом и центровать карточки поменьше.
 */
function placeLevels(
  order: Placement[],
  levelSizes: number[],
  levelGap: number,
): { alongExtent: number; acrossExtent: number } {
  const levelOffsets: number[] = []
  let offset = 0

  for (let depth = 0; depth < levelSizes.length; depth += 1) {
    levelOffsets[depth] = offset
    offset += (levelSizes[depth] ?? 0) + levelGap
  }

  let acrossExtent = 0

  for (const placement of order) {
    const levelSize = levelSizes[placement.depth] ?? placement.alongSize
    // Карточка меньше своего уровня — стоит по центру полосы, а не по краю.
    placement.along = levelOffsets[placement.depth]! + (levelSize - placement.alongSize) / 2
    acrossExtent = Math.max(acrossExtent, placement.across + placement.acrossSize)
  }

  const lastLevel = levelSizes.length - 1
  const alongExtent = lastLevel < 0 ? 0 : levelOffsets[lastLevel]! + levelSizes[lastLevel]!

  return { alongExtent, acrossExtent }
}

/**
 * Раскладка «уровнями»: каждый уровень укладывается сам по себе, узел за узлом
 * от начала полосы. Родитель больше не садится по центру детей — зато высота
 * уровня зависит только от того, сколько на нём узлов и какой у них отступ.
 *
 * Пригождается, когда уровни показывают по одному: в свайпере турнирной сетки
 * раунд из восьми матчей и полуфинал из двух каждый начинаются сверху и
 * получают свой отступ, а не тот, что достался от соседнего уровня.
 */
function stackNodes<T>(roots: TreeNode<T>[], options: TreeViewOptions<T>): Placements {
  const vertical = options.direction === 'top-to-bottom' || options.direction === 'bottom-to-top'
  const byId = new Map<string, Placement>()
  const order: Placement[] = []
  const levelSizes: number[] = []
  const levels: TreeNode<T>[][] = []

  for (const node of flatten(roots)) (levels[node.depth] ??= []).push(node)

  levels.forEach((level, depth) => {
    let cursor = 0

    for (const node of level) {
      const width = sizeOf(options.nodeWidth, node)
      const height = sizeOf(options.nodeHeight, node)
      const alongSize = vertical ? height : width
      const acrossSize = vertical ? width : height

      levelSizes[depth] = Math.max(levelSizes[depth] ?? 0, alongSize)

      const placement: Placement = { depth, along: 0, across: cursor, alongSize, acrossSize }
      byId.set(node.id, placement)
      order.push(placement)

      cursor += acrossSize + gapOf(options.siblingGap, node, level.length)
    }
  })

  return { byId, ...placeLevels(order, levelSizes, options.levelGap) }
}

/**
 * Считает место каждого узла.
 *
 * Правила всего два, и их легко проверить руками:
 *  - лист встаёт сразу за предыдущим: «конец соседа + siblingGap»;
 *  - родитель встаёт ровно по центру между первым и последним ребёнком.
 *
 * Карточки могут быть разного размера, поэтому позиции считаются в пикселях,
 * а не в номерах колонок: следующий узел всегда начинается там, где кончился
 * предыдущий. Уровень занимает столько, сколько занимает самая крупная
 * карточка на нём, а карточки поменьше центруются внутри этой полосы.
 */
export function placeNodes<T>(roots: TreeNode<T>[], options: TreeViewOptions<T>): Placements {
  if (options.levelLayout === 'stack') return stackNodes(roots, options)

  const vertical = options.direction === 'top-to-bottom' || options.direction === 'bottom-to-top'
  const counts = countByDepth(roots)
  const byId = new Map<string, Placement>()
  /** Те же места, но по порядку размещения — нужно, чтобы двигать ветку целиком. */
  const order: Placement[] = []
  /** Следующая свободная позиция поперёк уровня. */
  let cursor = 0
  /** Насколько толстый каждый уровень: максимум по его карточкам. */
  const levelSizes: number[] = []

  function place(node: TreeNode<T>): Placement {
    const width = sizeOf(options.nodeWidth, node)
    const height = sizeOf(options.nodeHeight, node)
    const alongSize = vertical ? height : width
    const acrossSize = vertical ? width : height

    levelSizes[node.depth] = Math.max(levelSizes[node.depth] ?? 0, alongSize)

    const branchStart = cursor
    const branchIndex = order.length
    let across = cursor

    if (node.children.length > 0) {
      const children = node.children.map(place)
      const first = children[0]!
      const last = children[children.length - 1]!
      const firstCenter = first.across + first.acrossSize / 2
      const lastCenter = last.across + last.acrossSize / 2
      const center = (firstCenter + lastCenter) / 2

      across = center - acrossSize / 2

      // Карточка родителя шире, чем разлёт его детей, — вся ветка едет вправо,
      // иначе родитель налез бы на соседнюю ветку слева.
      const overflow = branchStart - across
      if (overflow > 0) {
        for (let i = branchIndex; i < order.length; i += 1) order[i]!.across += overflow
        across = branchStart
      }
    }

    const placement: Placement = { depth: node.depth, along: 0, across, alongSize, acrossSize }
    byId.set(node.id, placement)
    order.push(placement)

    // Соседям — стартовать за самым правым краем ветки, включая саму карточку.
    cursor = Math.max(
      cursor,
      across + acrossSize + gapOf(options.siblingGap, node, counts[node.depth] ?? 1),
    )
    return placement
  }

  roots.forEach(place)

  return { byId, ...placeLevels(order, levelSizes, options.levelGap) }
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
export function layoutTree<T>(roots: TreeNode<T>[], options?: Partial<TreeViewOptions<T>>): Layout<T> {
  const resolved = resolveOptions(options)

  if (roots.length === 0) {
    return { nodes: [], links: [], width: 0, height: 0 }
  }

  const vertical = resolved.direction === 'top-to-bottom' || resolved.direction === 'bottom-to-top'
  const { byId, alongExtent, acrossExtent } = placeNodes(roots, resolved)
  // У «перевёрнутых» направлений уровень 0 должен оказаться в конце холста.
  const mirrored = resolved.direction === 'bottom-to-top' || resolved.direction === 'right-to-left'

  const nodes: LayoutNode<T>[] = flatten(roots).map((node) => {
    const { along, across, alongSize, acrossSize } = byId.get(node.id)!
    const alongPosition = mirrored ? alongExtent - alongSize - along : along

    return {
      id: node.id,
      data: node.data,
      depth: node.depth,
      parentId: node.parentId,
      x: vertical ? across : alongPosition,
      y: vertical ? alongPosition : across,
      width: vertical ? acrossSize : alongSize,
      height: vertical ? alongSize : acrossSize,
      hasChildren: node.hasChildren,
      collapsed: node.collapsed,
    }
  })

  return {
    nodes,
    links: buildLinks(nodes, resolved),
    width: vertical ? acrossExtent : alongExtent,
    height: vertical ? alongExtent : acrossExtent,
  }
}
