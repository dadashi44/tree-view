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

/** Что ещё нужно знать линии, кроме своих концов. */
export interface PathOptions {
  /**
   * На каком расстоянии от ребёнка проходит колено. Тогда линии двух детей
   * сходятся сразу за их карточками и читаются как скобка на пару, а не как
   * два длинных хвоста. Не задано — колено ровно посередине.
   */
  elbowOffset?: number
  /**
   * Где сходятся дети одного родителя — координата поперёк уровня.
   * Нужна стилю `'bracket'`; без неё он ведёт себя как `'elbow'`.
   */
  groupMid?: number
}

/**
 * Строит атрибут `d` для `<path>`: прямая, «ступенька», скобка или кривая Безье.
 */
export function buildPath(
  from: Point,
  to: Point,
  style: LinkStyle,
  direction: Direction,
  options: PathOptions = {},
): string {
  const { elbowOffset, groupMid } = options
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

  // Колено: посередине или на заданном расстоянии от ребёнка,
  // но не дальше самого родителя.
  const cornerOf = (child: number, parent: number, middle: number) => {
    if (elbowOffset == null) return middle
    const span = Math.abs(parent - child)
    return round(child + Math.sign(parent - child) * Math.min(elbowOffset, span))
  }

  if (style === 'bracket') {
    // Дети сходятся в одну вертикаль на `mid`, и уже от неё линия идёт
    // к родителю — вдоль его края, если он стоит не по центру детей.
    if (vertical) {
      const corner = cornerOf(y2, y1, midY)
      const mid = round(groupMid ?? x1)
      return `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${corner} L ${x2} ${corner} L ${x2} ${y2}`
    }

    const corner = cornerOf(x2, x1, midX)
    const mid = round(groupMid ?? y1)
    return `M ${x1} ${y1} L ${x1} ${mid} L ${corner} ${mid} L ${corner} ${y2} L ${x2} ${y2}`
  }

  if (style === 'elbow') {
    if (vertical) {
      const cornerY = cornerOf(y2, y1, midY)
      return `M ${x1} ${y1} L ${x1} ${cornerY} L ${x2} ${cornerY} L ${x2} ${y2}`
    }

    const cornerX = cornerOf(x2, x1, midX)
    return `M ${x1} ${y1} L ${cornerX} ${y1} L ${cornerX} ${y2} L ${x2} ${y2}`
  }

  return vertical
    ? `M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`
    : `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`
}

/**
 * Середина группы детей поперёк уровня: там сходится «скобка».
 * Считается по крайним детям, как и положение родителя в обычной раскладке.
 */
function groupMiddles<T>(nodes: LayoutNode<T>[], vertical: boolean): Map<string, number> {
  const spans = new Map<string, { min: number; max: number }>()

  for (const node of nodes) {
    if (node.parentId == null) continue

    const center = vertical ? node.x + node.width / 2 : node.y + node.height / 2
    const span = spans.get(node.parentId)

    if (!span) spans.set(node.parentId, { min: center, max: center })
    else {
      span.min = Math.min(span.min, center)
      span.max = Math.max(span.max, center)
    }
  }

  return new Map([...spans].map(([id, span]) => [id, (span.min + span.max) / 2]))
}

/** Для каждого узла с родителем создаёт линию «родитель → ребёнок». */
export function buildLinks<T>(nodes: LayoutNode<T>[], options: TreeViewOptions): LayoutLink<T>[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const links: LayoutLink<T>[] = []
  const middles =
    options.linkStyle === 'bracket'
      ? groupMiddles(nodes, isVertical(options.direction))
      : undefined

  for (const node of nodes) {
    const parent = node.parentId == null ? undefined : byId.get(node.parentId)
    if (!parent) continue

    const { from, to } = getAnchors(parent, node, options.direction)
    links.push({
      id: `${parent.id}->${node.id}`,
      source: parent,
      target: node,
      path: buildPath(from, to, options.linkStyle, options.direction, {
        elbowOffset: options.elbowOffset,
        groupMid: middles?.get(parent.id),
      }),
    })
  }

  return links
}
