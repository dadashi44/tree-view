import { describe, expect, it } from 'vitest'
import { buildLinks, buildPath, getAnchors } from '../src/links'
import { resolveOptions } from '../src/defaults'
import { layoutTree } from '../src/layout'
import { toTree } from '../src/normalize'
import type { LayoutNode } from '../src/types'
import { bracket } from './fixtures'

/** Две карточки 100×50: одна в (0,0), вторая в (200,100). */
const source: LayoutNode<null> = {
  id: 'a', data: null, depth: 0, parentId: null,
  x: 0, y: 0, width: 100, height: 50, hasChildren: true, collapsed: false,
}
const target: LayoutNode<null> = {
  id: 'b', data: null, depth: 1, parentId: 'a',
  x: 200, y: 100, width: 100, height: 50, hasChildren: false, collapsed: false,
}

describe('getAnchors', () => {
  it('top-to-bottom: из низа родителя в верх ребёнка', () => {
    expect(getAnchors(source, target, 'top-to-bottom')).toEqual({
      from: { x: 50, y: 50 },
      to: { x: 250, y: 100 },
    })
  })

  it('bottom-to-top: из верха родителя в низ ребёнка', () => {
    expect(getAnchors(source, target, 'bottom-to-top')).toEqual({
      from: { x: 50, y: 0 },
      to: { x: 250, y: 150 },
    })
  })

  it('left-to-right: из правого края в левый', () => {
    expect(getAnchors(source, target, 'left-to-right')).toEqual({
      from: { x: 100, y: 25 },
      to: { x: 200, y: 125 },
    })
  })

  it('right-to-left: из левого края в правый', () => {
    expect(getAnchors(source, target, 'right-to-left')).toEqual({
      from: { x: 0, y: 25 },
      to: { x: 300, y: 125 },
    })
  })
})

describe('buildPath', () => {
  const from = { x: 0, y: 0 }
  const to = { x: 100, y: 100 }

  it('straight — просто отрезок', () => {
    expect(buildPath(from, to, 'straight', 'top-to-bottom')).toBe('M 0 0 L 100 100')
  })

  it('elbow по вертикали ломается посередине по Y', () => {
    expect(buildPath(from, to, 'elbow', 'top-to-bottom')).toBe('M 0 0 L 0 50 L 100 50 L 100 100')
  })

  it('elbow по горизонтали ломается посередине по X', () => {
    expect(buildPath(from, to, 'elbow', 'left-to-right')).toBe('M 0 0 L 50 0 L 50 100 L 100 100')
  })

  it('curve по вертикали — кубическая кривая с опорами по Y', () => {
    expect(buildPath(from, to, 'curve', 'top-to-bottom')).toBe('M 0 0 C 0 50 100 50 100 100')
  })

  it('curve по горизонтали — опоры по X', () => {
    expect(buildPath(from, to, 'curve', 'right-to-left')).toBe('M 0 0 C 50 0 50 100 100 100')
  })

  it('округляет координаты до сотых', () => {
    expect(buildPath({ x: 1 / 3, y: 0 }, { x: 0, y: 0 }, 'straight', 'top-to-bottom')).toBe('M 0.33 0 L 0 0')
  })
})

describe('buildLinks', () => {
  it('линий ровно на одну меньше, чем узлов в одном дереве', () => {
    const layout = layoutTree(toTree(bracket))
    expect(layout.links).toHaveLength(layout.nodes.length - 1)
  })

  it('ключ линии собран из id родителя и ребёнка', () => {
    const layout = layoutTree(toTree(bracket))
    expect(layout.links.map((link) => link.id)).toContain('final->sf-1')
  })

  it('в линии лежат сами узлы, а не их копии', () => {
    const layout = layoutTree(toTree(bracket))
    const link = layout.links.find((item) => item.id === 'final->sf-1')!

    expect(link.source).toBe(layout.nodes.find((node) => node.id === 'final'))
    expect(link.target).toBe(layout.nodes.find((node) => node.id === 'sf-1'))
  })

  it('для одиноких узлов линий нет', () => {
    expect(buildLinks([source], resolveOptions())).toEqual([])
  })
})
