import { describe, expect, it } from 'vitest'
import { layoutTree } from '../src/layout'
import { toTree } from '../src/normalize'
import type { LayoutNode, TreeViewOptions } from '../src/types'
import { bracket, type Match } from './fixtures'

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

describe('размер карточки функцией', () => {
  /** Типичный случай: у финала одна строка вместо двух. */
  const halfFinal = (node: { data: Match }) => (node.data.id === 'final' ? 25 : 50)

  it('к каждому узлу применяется свой размер', () => {
    const layout = layoutTree(toTree(bracket), { ...options, nodeHeight: halfFinal })
    const nodes = byId(layout.nodes)

    expect(nodes['final']!.height).toBe(25)
    expect(nodes['sf-1']!.height).toBe(50)
  })

  it('линия приходит в середину карточки, а не в середину чужого бокса', () => {
    const layout = layoutTree(toTree(bracket), { ...options, nodeHeight: halfFinal })
    const nodes = byId(layout.nodes)
    const final = nodes['final']!

    // Финал на своём уровне один, поэтому стоит в начале полосы.
    expect(final.y).toBe(0)
    expect(final.y + final.height / 2).toBe(12.5)
  })

  it('уровень с низкой карточкой занимает меньше места по высоте', () => {
    const uniform = layoutTree(toTree(bracket), options)
    const variable = layoutTree(toTree(bracket), { ...options, nodeHeight: halfFinal })

    // Уровень финала стал тоньше на 25px — на столько же ниже холст.
    expect(uniform.height - variable.height).toBe(25)
  })

  it('соседи расступаются под карточки разной высоты', () => {
    // Горизонтальная сетка: высота карточки — это размер поперёк уровня.
    const byTeams = (node: { data: Match }) => (node.data.id === 'qf-1' ? 200 : 50)
    const layout = layoutTree(toTree(bracket), { ...options, direction: 'right-to-left', nodeHeight: byTeams })
    const nodes = byId(layout.nodes)

    expect(nodes['qf-1']!.y).toBe(0)
    expect(nodes['qf-1']!.height).toBe(200)
    // Следующий четвертьфинал начинается за высокой карточкой, а не за её «боксом».
    expect(nodes['qf-2']!.y).toBe(220)
  })

  it('карточка шире разлёта детей не залезает на соседнюю ветку', () => {
    const tree = toTree([
      { id: 'left' },
      { id: 'wide', children: [{ id: 'only-child' }] },
    ])
    const layout = layoutTree(tree, { ...options, nodeWidth: (node) => (node.data.id === 'wide' ? 400 : 100) })
    const nodes = byId(layout.nodes)

    expect(nodes['left']!.x).toBe(0)
    // Ветка целиком уехала вправо: «wide» начинается там, где кончился сосед.
    expect(nodes['wide']!.x).toBe(120)
    expect(nodes['only-child']!.x).toBeGreaterThanOrEqual(120)
    expect(layout.nodes.every((node) => node.x >= 0)).toBe(true)
  })

  it('функция получает узел целиком: данные, глубину и детей', () => {
    const seen: Array<{ id: string; depth: number; hasChildren: boolean }> = []

    layoutTree(toTree(bracket), {
      ...options,
      nodeHeight: (node) => {
        seen.push({ id: node.data.id, depth: node.depth, hasChildren: node.hasChildren })
        return 50
      },
    })

    expect(seen).toContainEqual({ id: 'final', depth: 0, hasChildren: true })
    expect(seen).toContainEqual({ id: 'qf-1', depth: 2, hasChildren: false })
  })
})
