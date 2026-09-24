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

describe('elbowOffset', () => {
  const from = { x: 300, y: 50 }
  const to = { x: 100, y: 10 }

  it('без него колено ровно посередине', () => {
    expect(buildPath(from, to, 'elbow', 'right-to-left')).toBe(
      'M 300 50 L 200 50 L 200 10 L 100 10',
    )
  })

  it('с ним колено стоит вплотную к ребёнку', () => {
    // Ребёнок слева, родитель справа: колено на 20 правее ребёнка.
    expect(buildPath(from, to, 'elbow', 'right-to-left', { elbowOffset: 20 })).toBe(
      'M 300 50 L 120 50 L 120 10 L 100 10',
    )
  })

  it('дальше родителя колено не уходит', () => {
    expect(buildPath(from, to, 'elbow', 'right-to-left', { elbowOffset: 9999 })).toBe(
      'M 300 50 L 300 50 L 300 10 L 100 10',
    )
  })

  it('в вертикальном дереве работает так же', () => {
    expect(buildPath({ x: 50, y: 0 }, { x: 10, y: 200 }, 'elbow', 'top-to-bottom', { elbowOffset: 20 })).toBe(
      'M 50 0 L 50 180 L 10 180 L 10 200',
    )
  })

  it('кривую не трогает', () => {
    expect(buildPath(from, to, 'curve', 'right-to-left', { elbowOffset: 20 })).toBe(
      buildPath(from, to, 'curve', 'right-to-left'),
    )
  })
})

describe('linkStyle: bracket', () => {
  // Родитель справа на y=50, ребёнок слева на y=10, дети группы сходятся на y=30.
  const from = { x: 300, y: 50 }
  const to = { x: 100, y: 10 }

  it('ведёт от середины группы к родителю', () => {
    expect(
      buildPath(from, to, 'bracket', 'right-to-left', { elbowOffset: 20, groupMid: 30 }),
    ).toBe('M 300 50 L 300 30 L 120 30 L 120 10 L 100 10')
  })

  it('родитель по центру детей — скобка совпадает со «ступенькой»', () => {
    const centered = { x: 300, y: 30 }

    expect(buildPath(centered, to, 'bracket', 'right-to-left', { groupMid: 30 })).toBe(
      'M 300 30 L 300 30 L 200 30 L 200 10 L 100 10',
    )
  })

  it('без середины группы ведёт себя как «ступенька»', () => {
    expect(buildPath(from, to, 'bracket', 'right-to-left', { elbowOffset: 20 })).toBe(
      'M 300 50 L 300 50 L 120 50 L 120 10 L 100 10',
    )
  })

  it('в вертикальном дереве оси меняются местами', () => {
    expect(
      buildPath({ x: 50, y: 0 }, { x: 10, y: 200 }, 'bracket', 'top-to-bottom', {
        elbowOffset: 20,
        groupMid: 30,
      }),
    ).toBe('M 50 0 L 30 0 L 30 180 L 10 180 L 10 200')
  })
})

describe('buildLinks со скобкой', () => {
  it('считает середину группы по крайним детям', () => {
    const parent = { id: 'p', parentId: null, x: 300, y: 50, width: 100, height: 20 }
    const kids = [
      { id: 'a', parentId: 'p', x: 100, y: 0, width: 100, height: 20 },
      { id: 'b', parentId: 'p', x: 100, y: 100, width: 100, height: 20 },
    ]
    const nodes = [parent, ...kids].map((node) => ({ ...node, data: {}, depth: 0, hasChildren: false, collapsed: false })) as never

    const links = buildLinks(nodes, resolveOptions({ direction: 'right-to-left', linkStyle: 'bracket' }))

    // Центры детей 10 и 110 — середина 60, обе линии идут через неё.
    expect(links.every((link) => link.path.includes(' 60 '))).toBe(true)
  })
})
