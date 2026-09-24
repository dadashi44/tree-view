import type { Direction, LayoutLink, LayoutNode, LinkStyle, Point, TreeViewOptions } from './types'

/** Округление до сотых: убирает «хвосты» вроде 12.000000001 в атрибуте `d`. */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Вертикальные направления рисуются сверху вниз, горизонтальные — слева направо. */
function isVertical(direction: Direction): boolean {
  return direction === 'top-to-bottom' || direction === 'bottom-to-top'
}

/**
 * Точки, из которой линия выходит, и в которую приходит.
 * Всегда середина стороны карточки, обращённой к собеседнику.
 */
export function getAnchors<T>(
  source: LayoutNode<T>,
  target: LayoutNode<T>,
  direction: Direction,
): { from: Point; to: Point } {
  const sourceCenterX = source.x + source.width / 2
  const sourceCenterY = source.y + source.height / 2
  const targetCenterX = target.x + target.width / 2
  const targetCenterY = target.y + target.height / 2

  switch (direction) {
    case 'top-to-bottom':
      return { from: { x: sourceCenterX, y: source.y + source.height }, to: { x: targetCenterX, y: target.y } }
    case 'bottom-to-top':
      return { from: { x: sourceCenterX, y: source.y }, to: { x: targetCenterX, y: target.y + target.height } }
    case 'left-to-right':
      return { from: { x: source.x + source.width, y: sourceCenterY }, to: { x: target.x, y: targetCenterY } }
    case 'right-to-left':
      return { from: { x: source.x, y: sourceCenterY }, to: { x: target.x + target.width, y: targetCenterY } }
  }
}

/**
 * Строит атрибут `d` для `<path>`: прямая, «ступенька» или кривая Безье.
 *
 * `elbowOffset` сдвигает колено «ступеньки» ближе к ребёнку: тогда линии двух
 * детей сходятся сразу за их карточками и читаются как скобка на пару,
 * а не как два длинных хвоста. Не задан — колено ровно посередине.
 */
export function buildPath(
  from: Point,
  to: Point,
  style: LinkStyle,
  direction: Direction,
  elbowOffset?: number,
): string {
  const x1 = round(from.x)
  const y1 = round(from.y)
  const x2 = round(to.x)
  const y2 = round(to.y)

  if (style === 'straight') {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  const vertical = isVertical(direction)
  // Середина между узлами — по той оси, вдоль которой растёт дерево.
  const midX = round((x1 + x2) / 2)
  const midY = round((y1 + y2) / 2)

  if (style === 'elbow') {
    // Колено: посередине или на заданном расстоянии от ребёнка,
    // но не дальше самого родителя.
    const corner = (child: number, parent: number, middle: number) => {
      if (elbowOffset == null) return middle
      const span = Math.abs(parent - child)
      return round(child + Math.sign(parent - child) * Math.min(elbowOffset, span))
    }

    if (vertical) {
      const cornerY = corner(y2, y1, midY)
      return `M ${x1} ${y1} L ${x1} ${cornerY} L ${x2} ${cornerY} L ${x2} ${y2}`
    }

    const cornerX = corner(x2, x1, midX)
    return `M ${x1} ${y1} L ${cornerX} ${y1} L ${cornerX} ${y2} L ${x2} ${y2}`
  }

  return vertical
    ? `M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`
    : `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`
}

/** Для каждого узла с родителем создаёт линию «родитель → ребёнок». */
export function buildLinks<T>(nodes: LayoutNode<T>[], options: TreeViewOptions): LayoutLink<T>[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const links: LayoutLink<T>[] = []

  for (const node of nodes) {
    const parent = node.parentId == null ? undefined : byId.get(node.parentId)
    if (!parent) continue

    const { from, to } = getAnchors(parent, node, options.direction)
    links.push({
      id: `${parent.id}->${node.id}`,
      source: parent,
      target: node,
      path: buildPath(from, to, options.linkStyle, options.direction, options.elbowOffset),
    })
  }

  return links
}
