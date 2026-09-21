import { describe, expect, it } from 'vitest'
import { layoutTree } from '../src/layout'
import { toTree } from '../src/normalize'
import type { LayoutNode, TreeViewOptions } from '../src/types'
import { bracket } from './fixtures'

/** Удобные круглые числа, чтобы ожидания в тестах считались в уме. */
const options: Partial<TreeViewOptions> = {
  nodeWidth: 100,
  nodeHeight: 50,
  levelGap: 50,
  siblingGap: 20,
  direction: 'top-to-bottom',
}

function byId<T>(nodes: LayoutNode<T>[]): Record<string, LayoutNode<T>> {
  return Object.fromEntries(nodes.map((node) => [node.id, node]))
}

describe('layoutTree', () => {
  it('пустое дерево даёт пустой холст', () => {
    expect(layoutTree([])).toEqual({ nodes: [], links: [], width: 0, height: 0 })
  })

  it('единственный узел стоит в начале координат', () => {
    const layout = layoutTree(toTree({ id: 'one' }), options)

    expect(layout.nodes).toHaveLength(1)
    expect(layout.nodes[0]).toMatchObject({ x: 0, y: 0, width: 100, height: 50 })
    expect(layout).toMatchObject({ width: 100, height: 50 })
  })

  it('листья идут подряд с шагом «размер + зазор»', () => {
    const layout = layoutTree(toTree(bracket), options)
    const nodes = byId(layout.nodes)

    expect(nodes['qf-1']!.x).toBe(0)
    expect(nodes['qf-2']!.x).toBe(120)
    expect(nodes['qf-3']!.x).toBe(240)
    expect(nodes['qf-4']!.x).toBe(360)
  })

  it('родитель стоит ровно по центру своих детей', () => {
    const layout = layoutTree(toTree(bracket), options)
    const nodes = byId(layout.nodes)

    const centerOf = (node: LayoutNode<unknown>) => node.x + node.width / 2

    expect(centerOf(nodes['sf-1']!)).toBe((centerOf(nodes['qf-1']!) + centerOf(nodes['qf-2']!)) / 2)
    expect(centerOf(nodes['final']!)).toBe((centerOf(nodes['sf-1']!) + centerOf(nodes['sf-2']!)) / 2)
  })

  it('уровни отстоят друг от друга на «высота + levelGap»', () => {
    const layout = layoutTree(toTree(bracket), options)
    const nodes = byId(layout.nodes)

    expect(nodes['final']!.y).toBe(0)
    expect(nodes['sf-1']!.y).toBe(100)
    expect(nodes['qf-1']!.y).toBe(200)
  })

  it('считает размер холста по крайним узлам', () => {
    const layout = layoutTree(toTree(bracket), options)

    expect(layout.width).toBe(460)
    expect(layout.height).toBe(250)
  })

  it('bottom-to-top переворачивает уровни', () => {
    const layout = layoutTree(toTree(bracket), { ...options, direction: 'bottom-to-top' })
    const nodes = byId(layout.nodes)

    expect(nodes['final']!.y).toBe(200)
    expect(nodes['qf-1']!.y).toBe(0)
    expect(layout.height).toBe(250)
  })

  it('left-to-right меняет оси местами', () => {
    const layout = layoutTree(toTree(bracket), { ...options, direction: 'left-to-right' })
    const nodes = byId(layout.nodes)

    expect(nodes['final']!.x).toBe(0)
    expect(nodes['sf-1']!.x).toBe(150)
    expect(nodes['qf-1']!.y).toBe(0)
    expect(nodes['qf-2']!.y).toBe(70)
    expect(layout).toMatchObject({ width: 400, height: 260 })
  })

  it('right-to-left ставит корень справа (классическая сетка)', () => {
    const layout = layoutTree(toTree(bracket), { ...options, direction: 'right-to-left' })
    const nodes = byId(layout.nodes)

    expect(nodes['final']!.x).toBe(300)
    expect(nodes['sf-1']!.x).toBe(150)
    expect(nodes['qf-1']!.x).toBe(0)
    expect(layout.width).toBe(400)
  })

  it('узлы одного уровня никогда не накладываются', () => {
    const layout = layoutTree(toTree(bracket), options)

    const levels = new Map<number, LayoutNode<unknown>[]>()
    for (const node of layout.nodes) {
      levels.set(node.depth, [...(levels.get(node.depth) ?? []), node])
    }

    for (const nodesOnLevel of levels.values()) {
      const sorted = [...nodesOnLevel].sort((a, b) => a.x - b.x)
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i]!.x).toBeGreaterThanOrEqual(sorted[i - 1]!.x + sorted[i - 1]!.width)
      }
    }
  })

  it('несколько корней стоят рядом, не пересекаясь', () => {
    const layout = layoutTree(toTree([{ id: 'a' }, { id: 'b' }]), options)
    const nodes = byId(layout.nodes)

    expect(nodes['a']!.x).toBe(0)
    expect(nodes['b']!.x).toBe(120)
  })

  it('размеры карточки берутся из настроек', () => {
    const layout = layoutTree(toTree({ id: 'one' }), { nodeWidth: 240, nodeHeight: 90 })

    expect(layout.nodes[0]).toMatchObject({ width: 240, height: 90 })
  })

  it('частичные настройки дополняются значениями по умолчанию', () => {
    const layout = layoutTree(toTree({ id: 'one' }), { nodeWidth: 300 })

    expect(layout.nodes[0]!.width).toBe(300)
    expect(layout.nodes[0]!.height).toBe(64)
  })
})
