import { describe, expect, it } from 'vitest'
import { applyCollapsed, toggleCollapsed } from '../src/collapse'
import { layoutTree } from '../src/layout'
import { toTree } from '../src/normalize'
import { bracket } from './fixtures'

describe('applyCollapsed', () => {
  it('убирает детей свёрнутого узла из раскладки', () => {
    const roots = applyCollapsed(toTree(bracket), new Set(['sf-1']))
    const ids = layoutTree(roots).nodes.map((node) => node.id)

    expect(ids).toContain('sf-1')
    expect(ids).not.toContain('qf-1')
    expect(ids).toContain('qf-3')
  })

  it('помечает узел как collapsed, но помнит, что дети были', () => {
    const roots = applyCollapsed(toTree(bracket), new Set(['sf-1']))
    const collapsedNode = roots[0]!.children[0]!

    expect(collapsedNode.collapsed).toBe(true)
    expect(collapsedNode.hasChildren).toBe(true)
  })

  it('не меняет ни исходное дерево, ни данные пользователя', () => {
    const roots = toTree(bracket)

    applyCollapsed(roots, new Set(['sf-1']))

    expect(roots[0]!.children[0]!.children).toHaveLength(2)
    expect(roots[0]!.children[0]!.collapsed).toBe(false)
    expect(bracket.children![0]!.children).toHaveLength(2)
  })

  it('без свёрнутых узлов возвращает то же дерево', () => {
    const roots = toTree(bracket)
    expect(applyCollapsed(roots, new Set())).toBe(roots)
  })
})

describe('toggleCollapsed', () => {
  it('добавляет id, если его не было', () => {
    expect([...toggleCollapsed(new Set(), 'a')]).toEqual(['a'])
  })

  it('убирает id, если он был', () => {
    expect([...toggleCollapsed(new Set(['a', 'b']), 'a')]).toEqual(['b'])
  })

  it('не меняет переданное множество', () => {
    const original = new Set(['a'])
    toggleCollapsed(original, 'b')
    expect([...original]).toEqual(['a'])
  })
})
