import type { Layout, LayoutLink, LayoutNode } from './types'

/**
 * Виртуализация: рисуем только то, что видно на экране.
 *
 * Математика раскладки дешёвая — тысяча матчей считается меньше чем за
 * миллисекунду. Дорого стоит DOM: у каждой карточки свои элементы, и на
 * тысяче матчей их около десяти тысяч. Поэтому список узлов и линий
 * фильтруется по видимой области, а при перетаскивании пересобирается
 * только разница.
 */

/** Прямоугольник в координатах раскладки (не экрана). */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Запас вокруг видимой области, чтобы при перетаскивании не мигали края. */
export const DEFAULT_OVERSCAN = 400

/** Меньше этого числа узлов фильтровать смысла нет — дешевле нарисовать всё. */
export const VIRTUALIZE_THRESHOLD = 150

/** Пересекаются ли прямоугольники (касание краями считается пересечением). */
function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  )
}

/** Прямоугольник, в который целиком помещается линия вместе с обоими узлами. */
function linkRect<T>(link: LayoutLink<T>): Rect {
  const { source, target } = link
  const x = Math.min(source.x, target.x)
  const y = Math.min(source.y, target.y)

  return {
    x,
    y,
    width: Math.max(source.x + source.width, target.x + target.width) - x,
    height: Math.max(source.y + source.height, target.y + target.height) - y,
  }
}

/** Расширяет прямоугольник во все стороны. */
export function expandRect(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, width: rect.width + by * 2, height: rect.height + by * 2 }
}

/**
 * Оставляет в раскладке только узлы и линии, попадающие в видимую область.
 *
 * Размеры холста (`width`/`height`) не меняются: полоса прокрутки и
 * `fit()` должны видеть дерево целиком, даже если нарисована его часть.
 */
export function visibleLayout<T>(
  layout: Layout<T>,
  view: Rect | null,
  overscan: number = DEFAULT_OVERSCAN,
): Layout<T> {
  if (!view || layout.nodes.length < VIRTUALIZE_THRESHOLD) return layout

  // Холста не видно совсем (уехал за экран) — рисовать нечего.
  if (view.width <= 0 || view.height <= 0) {
    return { nodes: [], links: [], width: layout.width, height: layout.height }
  }

  const area = expandRect(view, overscan)
  const nodes: LayoutNode<T>[] = []
  const links: LayoutLink<T>[] = []

  for (const node of layout.nodes) {
    if (intersects(area, node)) nodes.push(node)
  }
  for (const link of layout.links) {
    if (intersects(area, linkRect(link))) links.push(link)
  }

  return { nodes, links, width: layout.width, height: layout.height }
}

/**
 * Грубая оценка видимой области до первого измерения — размер окна.
 *
 * Нужна, чтобы самый первый кадр не рисовал дерево целиком: измерить холст
 * можно только после того, как он окажется в DOM, а к этому моменту тысяча
 * карточек уже была бы создана и выброшена.
 */
export function estimateVisibleRect(): Rect | null {
  if (typeof window === 'undefined') return null

  return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
}

/**
 * Считает видимую часть холста по его же положению на экране.
 *
 * Работает и когда дерево двигают мышью внутри контейнера, и когда оно
 * стоит в обычном скролле страницы: холст сам сдвинут и отмасштабирован,
 * поэтому достаточно пересечь его прямоугольник с окном браузера.
 */
export function measureVisibleRect(canvas: Element | null | undefined, scale: number): Rect | null {
  if (!canvas || typeof window === 'undefined' || scale <= 0) return null

  const box = canvas.getBoundingClientRect()
  const left = Math.max(box.left, 0)
  const top = Math.max(box.top, 0)
  const right = Math.min(box.right, window.innerWidth)
  const bottom = Math.min(box.bottom, window.innerHeight)

  // Холст полностью за пределами экрана — рисовать нечего.
  if (right <= left || bottom <= top) return { x: 0, y: 0, width: 0, height: 0 }

  return {
    x: (left - box.left) / scale,
    y: (top - box.top) / scale,
    width: (right - left) / scale,
    height: (bottom - top) / scale,
  }
}
