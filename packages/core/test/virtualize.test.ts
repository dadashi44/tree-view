// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { layoutTree } from '../src/layout'
import { toTree } from '../src/normalize'
import {
  expandRect,
  measureVisibleRect,
  visibleLayout,
  VIRTUALIZE_THRESHOLD,
  type Rect,
} from '../src/virtualize'
import type { Layout } from '../src/types'

/** Ровная «лесенка» из n узлов: каждый следующий на 100px ниже предыдущего. */
function ladder(count: number): Layout<{ id: string }> {
  const items = Array.from({ length: count }, (_, index) => ({ id: `n-${index}` }))
  return layoutTree(toTree(items), {
    nodeWidth: 100,
    nodeHeight: 50,
    siblingGap: 50,
    direction: 'left-to-right',
  })
}

/** Дерево с линиями: корень и его дети. */
function withLinks(children: number): Layout<{ id: string }> {
  const data = {
    id: 'root',
    children: Array.from({ length: children }, (_, index) => ({ id: `child-${index}` })),
  }
  return layoutTree(toTree(data), { nodeWidth: 100, nodeHeight: 50, levelGap: 50, siblingGap: 50 })
}

describe('visibleLayout', () => {
  it('оставляет только узлы, попадающие в видимую область', () => {
    const layout = ladder(400)
    const view: Rect = { x: 0, y: 0, width: 100, height: 200 }

    const drawn = visibleLayout(layout, view, 0)

    expect(drawn.nodes.map((node) => node.id)).toEqual(['n-0', 'n-1', 'n-2'])
  })

  it('запас по краям добавляет соседей, чтобы они не мигали при перетаскивании', () => {
    const layout = ladder(400)
    const view: Rect = { x: 0, y: 0, width: 100, height: 200 }

    const drawn = visibleLayout(layout, view, 200)

    expect(drawn.nodes.length).toBeGreaterThan(visibleLayout(layout, view, 0).nodes.length)
    expect(drawn.nodes[0]!.id).toBe('n-0')
  })

  it('размер холста не меняется: полоса прокрутки и fit() видят дерево целиком', () => {
    const layout = ladder(400)
    const drawn = visibleLayout(layout, { x: 0, y: 0, width: 100, height: 200 }, 0)

    expect(drawn.width).toBe(layout.width)
    expect(drawn.height).toBe(layout.height)
    expect(drawn.nodes.length).toBeLessThan(layout.nodes.length)
  })

  it('без видимой области рисуем всё — это состояние «ещё не измерили»', () => {
    const layout = ladder(400)

    expect(visibleLayout(layout, null).nodes).toHaveLength(400)
  })

  it('маленькое дерево не фильтруется: дешевле нарисовать целиком', () => {
    const layout = ladder(VIRTUALIZE_THRESHOLD - 1)
    const drawn = visibleLayout(layout, { x: 0, y: 0, width: 10, height: 10 }, 0)

    expect(drawn).toBe(layout)
  })

  it('холст уехал с экрана — не рисуем ничего', () => {
    const layout = ladder(400)
    const drawn = visibleLayout(layout, { x: 0, y: 0, width: 0, height: 0 }, 0)

    expect(drawn.nodes).toHaveLength(0)
  })

  it('линия остаётся, даже если виден только один её конец', () => {
    const layout = withLinks(VIRTUALIZE_THRESHOLD + 10)
    const root = layout.nodes.find((node) => node.id === 'root')!
    const view: Rect = { x: root.x, y: root.y, width: root.width, height: root.height }

    const drawn = visibleLayout(layout, view, 0)

    // Сам корень виден, его дети — нет, но линии к ним обрываться не должны.
    expect(drawn.nodes.map((node) => node.id)).toContain('root')
    expect(drawn.links.length).toBeGreaterThan(0)
  })
})

describe('expandRect', () => {
  it('раздвигает прямоугольник во все стороны', () => {
    expect(expandRect({ x: 10, y: 10, width: 100, height: 50 }, 5)).toEqual({
      x: 5,
      y: 5,
      width: 110,
      height: 60,
    })
  })
})

describe('measureVisibleRect', () => {
  /** Заглушка элемента: важны только его координаты на экране. */
  function elementAt(box: { left: number; top: number; width: number; height: number }) {
    return {
      getBoundingClientRect: () => ({
        left: box.left,
        top: box.top,
        right: box.left + box.width,
        bottom: box.top + box.height,
        width: box.width,
        height: box.height,
      }),
    } as unknown as Element
  }

  it('холст целиком на экране — видно его целиком', () => {
    const rect = measureVisibleRect(elementAt({ left: 0, top: 0, width: 400, height: 300 }), 1)

    expect(rect).toMatchObject({ x: 0, y: 0, width: 400, height: 300 })
  })

  it('часть холста уехала вверх — видимая область начинается не с нуля', () => {
    const rect = measureVisibleRect(elementAt({ left: 0, top: -200, width: 400, height: 1000 }), 1)

    expect(rect!.y).toBe(200)
  })

  it('координаты переводятся в масштаб холста', () => {
    const rect = measureVisibleRect(elementAt({ left: 0, top: -100, width: 400, height: 1000 }), 0.5)

    // На экране сдвиг 100px, в координатах раскладки — вдвое больше.
    expect(rect!.y).toBe(200)
    expect(rect!.width).toBe(800)
  })

  it('холст за пределами экрана — пустая область', () => {
    const rect = measureVisibleRect(elementAt({ left: 0, top: -5000, width: 400, height: 300 }), 1)

    expect(rect).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('без элемента или с нулевым масштабом возвращает null, а не падает', () => {
    expect(measureVisibleRect(null, 1)).toBeNull()
    expect(measureVisibleRect(elementAt({ left: 0, top: 0, width: 10, height: 10 }), 0)).toBeNull()
  })
})
