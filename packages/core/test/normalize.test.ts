import { describe, expect, it } from 'vitest'
import { toTree } from '../src/normalize'
import { bracket, flatBracket } from './fixtures'

describe('toTree — вложенный формат', () => {
  it('строит дерево и считает глубину', () => {
    const [root] = toTree(bracket)

    expect(root!.id).toBe('final')
    expect(root!.depth).toBe(0)
    expect(root!.parentId).toBeNull()
    expect(root!.children).toHaveLength(2)
    expect(root!.children[0]!.depth).toBe(1)
    expect(root!.children[0]!.children[0]!.depth).toBe(2)
  })

  it('проставляет hasChildren и collapsed', () => {
    const [root] = toTree(bracket)
    const leaf = root!.children[0]!.children[0]!

    expect(root!.hasChildren).toBe(true)
    expect(root!.collapsed).toBe(false)
    expect(leaf.hasChildren).toBe(false)
  })

  it('сохраняет исходный объект в data', () => {
    const [root] = toTree(bracket)
    expect(root!.data).toBe(bracket)
  })

  it('принимает массив корней (лес)', () => {
    const roots = toTree([{ id: 'a' }, { id: 'b' }])
    expect(roots.map((node) => node.id)).toEqual(['a', 'b'])
  })

  it('без id использует путь — он стабилен между вызовами', () => {
    const data = { title: 'корень', children: [{ title: 'ребёнок' }] }

    const first = toTree(data)
    const second = toTree(data)

    expect(first[0]!.id).toBe('0')
    expect(first[0]!.children[0]!.id).toBe('0.0')
    expect(second[0]!.children[0]!.id).toBe(first[0]!.children[0]!.id)
  })

  it('поддерживает свои аксессоры', () => {
    interface Item {
      key: string
      kids?: Item[]
    }

    const data: Item = { key: 'root', kids: [{ key: 'child' }] }

    const [root] = toTree<Item>(data, {
      getId: (item) => item.key,
      getChildren: (item) => item.kids,
    })

    expect(root!.id).toBe('root')
    expect(root!.children[0]!.id).toBe('child')
  })

  it('числовые id приводит к строке', () => {
    const [root] = toTree({ id: 42 })
    expect(root!.id).toBe('42')
  })

  it('падает с понятной ошибкой на дублях id', () => {
    const data = { id: 'x', children: [{ id: 'x' }] }
    expect(() => toTree(data)).toThrow(/Повторяющийся id/)
  })

  it('на пустом входе возвращает пустой массив', () => {
    expect(toTree(null)).toEqual([])
    expect(toTree(undefined)).toEqual([])
    expect(toTree([])).toEqual([])
  })
})

describe('toTree — плоский формат', () => {
  const accessors = {
    getId: (item: (typeof flatBracket)[number]) => item.matchId,
    getParentId: (item: (typeof flatBracket)[number]) => item.parent,
  }

  it('собирает дерево по parentId', () => {
    const [root] = toTree(flatBracket, accessors)

    expect(root!.id).toBe('final')
    expect(root!.children.map((node) => node.id)).toEqual(['sf-1', 'sf-2'])
    expect(root!.children[0]!.children.map((node) => node.id)).toEqual(['qf-1', 'qf-2'])
  })

  it('считает глубину', () => {
    const [root] = toTree(flatBracket, accessors)
    expect(root!.children[0]!.children[0]!.depth).toBe(2)
  })

  it('несколько корней — это нормально', () => {
    const roots = toTree(
      [
        { id: 'a', parentId: null },
        { id: 'b', parentId: null },
        { id: 'a-1', parentId: 'a' },
      ],
      { getParentId: (item) => item.parentId },
    )

    expect(roots.map((node) => node.id)).toEqual(['a', 'b'])
  })

  it('узел с несуществующим родителем становится корнем', () => {
    const roots = toTree([{ id: 'orphan', parentId: 'нет-такого' }], {
      getParentId: (item) => item.parentId,
    })

    expect(roots).toHaveLength(1)
    expect(roots[0]!.parentId).toBeNull()
  })

  it('ловит цикл вместо бесконечного обхода', () => {
    const cyclic = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ]

    expect(() => toTree(cyclic, { getParentId: (item) => item.parentId })).toThrow(/цикл/)
  })
})
