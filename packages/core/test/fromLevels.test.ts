import { describe, expect, it } from 'vitest'
import { fromLevels } from '../src/fromLevels'
import { layoutTree } from '../src/layout'

/** Три раунда bounty: 4 группы → 2 → финал. */
const levels = [
  [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }],
  [{ id: 'g5' }, { id: 'g6' }],
  [{ id: 'final' }],
]

describe('fromLevels', () => {
  it('корнем становится последний уровень', () => {
    const roots = fromLevels(levels)

    expect(roots).toHaveLength(1)
    expect(roots[0]!.id).toBe('final')
    expect(roots[0]!.depth).toBe(0)
  })

  it('пары соседних узлов сходятся в одного родителя', () => {
    const [root] = fromLevels(levels)
    const [left, right] = root!.children

    expect(left!.id).toBe('g5')
    expect(left!.children.map((node) => node.id)).toEqual(['g1', 'g2'])
    expect(right!.children.map((node) => node.id)).toEqual(['g3', 'g4'])
  })

  it('глубина растёт от финала к первому раунду', () => {
    const [root] = fromLevels(levels)

    expect(root!.depth).toBe(0)
    expect(root!.children[0]!.depth).toBe(1)
    expect(root!.children[0]!.children[0]!.depth).toBe(2)
  })

  it('проставляет parentId и hasChildren', () => {
    const [root] = fromLevels(levels)

    expect(root!.parentId).toBeNull()
    expect(root!.hasChildren).toBe(true)
    expect(root!.children[0]!.parentId).toBe('final')
    expect(root!.children[0]!.children[0]!.hasChildren).toBe(false)
  })

  it('неровное деление: лишние узлы достаются последнему родителю', () => {
    const [root] = fromLevels([
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
      [{ id: 'x' }, { id: 'y' }],
      [{ id: 'final' }],
    ])

    const [x, y] = root!.children
    expect(x!.children.map((node) => node.id)).toEqual(['a', 'b', 'c'])
    expect(y!.children.map((node) => node.id)).toEqual(['d', 'e'])
  })

  it('несколько узлов в последнем уровне дают лес', () => {
    const roots = fromLevels([
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'c' }, { id: 'd' }],
    ])

    expect(roots.map((node) => node.id)).toEqual(['c', 'd'])
  })

  it('пустые уровни пропускаются', () => {
    const roots = fromLevels([[{ id: 'a' }], [], [{ id: 'b' }]])

    expect(roots[0]!.id).toBe('b')
    expect(roots[0]!.children.map((node) => node.id)).toEqual(['a'])
  })

  it('на пустом входе возвращает пустой массив', () => {
    expect(fromLevels([])).toEqual([])
    expect(fromLevels([[], []])).toEqual([])
  })

  it('id можно задать своей функцией', () => {
    const roots = fromLevels([[{ name: 'первый' }], [{ name: 'второй' }]], {
      getId: (item) => item.name,
    })

    expect(roots[0]!.id).toBe('второй')
    expect(roots[0]!.children[0]!.id).toBe('первый')
  })

  it('без id берёт позицию — уровень и номер в нём', () => {
    const roots = fromLevels([[{ name: 'a' }, { name: 'b' }], [{ name: 'c' }]])

    expect(roots[0]!.id).toBe('1.0')
    expect(roots[0]!.children.map((node) => node.id)).toEqual(['0.0', '0.1'])
  })

  it('результат сразу раскладывается как обычное дерево', () => {
    const layout = layoutTree(fromLevels(levels), {
      nodeWidth: 100,
      nodeHeight: 50,
      levelGap: 50,
      siblingGap: 20,
      direction: 'right-to-left',
    })

    expect(layout.nodes).toHaveLength(7)
    expect(layout.links).toHaveLength(6)
    // Финал — правее всех, первый раунд — у левого края.
    expect(layout.nodes.find((node) => node.id === 'final')!.x).toBe(300)
    expect(layout.nodes.find((node) => node.id === 'g1')!.x).toBe(0)
  })
})
