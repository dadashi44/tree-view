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

describe('siblingGap функцией', () => {
  it('спрашивает отступ у каждого узла и сообщает размер уровня', () => {
    const seen: Array<[string, number]> = []

    layoutTree(toTree({ id: 'root', children: [{ id: 'a' }, { id: 'b' }] }), {
      nodeWidth: 100,
      nodeHeight: 50,
      siblingGap: (node, count) => {
        seen.push([node.id, count])
        return 10
      },
    })

    expect(seen).toEqual([
      ['a', 2],
      ['b', 2],
      ['root', 1],
    ])
  })

  it('разным уровням — разные отступы', () => {
    const layout = layoutTree(toTree({ id: 'root', children: [{ id: 'a' }, { id: 'b' }] }), {
      nodeWidth: 100,
      nodeHeight: 50,
      siblingGap: (_node, count) => count * 10,
    })

    const [a, b] = ['a', 'b'].map((id) => layout.nodes.find((node) => node.id === id)!)

    // Два узла на уровне — отступ 20.
    expect(b.x - (a.x + a.width)).toBe(20)
  })
})

describe('levelLayout: stack', () => {
  const data = {
    id: 'final',
    children: [
      { id: 'semi-1', children: [{ id: 'q1' }, { id: 'q2' }] },
      { id: 'semi-2', children: [{ id: 'q3' }, { id: 'q4' }] },
    ],
  }

  const stacked = () =>
    layoutTree(toTree(data), {
      nodeWidth: 100,
      nodeHeight: 50,
      levelGap: 20,
      siblingGap: 10,
      direction: 'right-to-left',
      levelLayout: 'stack',
    })

  it('по умолчанию все уровни начинаются с одной черты', () => {
    const layout = stacked()
    const tops = ['q1', 'semi-1', 'final'].map(
      (id) => layout.nodes.find((node) => node.id === id)!.y,
    )

    expect(tops).toEqual([0, 0, 0])
  })

  it('levelAlign: center сдвигает короткие уровни к центру', () => {
    const layout = layoutTree(toTree(data), {
      nodeWidth: 100,
      nodeHeight: 50,
      levelGap: 20,
      siblingGap: 10,
      direction: 'right-to-left',
      levelLayout: 'stack',
      levelAlign: 'center',
    })
    const tops = ['q1', 'semi-1', 'final'].map(
      (id) => layout.nodes.find((node) => node.id === id)!.y,
    )

    // Четвертьфиналы занимают 230, полуфиналы 110, финал 50 — сдвиг по половине разницы.
    expect(tops).toEqual([0, 60, 90])
  })

  it('узлы уровня идут подряд с его отступом', () => {
    const layout = stacked()
    const [q1, q2] = ['q1', 'q2'].map((id) => layout.nodes.find((node) => node.id === id)!)

    expect(q2.y - (q1.y + q1.height)).toBe(10)
  })

  it('высота — по самому населённому уровню', () => {
    // Четыре четвертьфинала: 4 × 50 + 3 × 10.
    expect(stacked().height).toBe(230)
  })

  it('родитель больше не сидит по центру детей', () => {
    const layout = stacked()
    const semi = layout.nodes.find((node) => node.id === 'semi-2')!
    const children = ['q3', 'q4'].map((id) => layout.nodes.find((node) => node.id === id)!)
    const center = (children[0]!.y + children[1]!.y + children[1]!.height) / 2

    expect(semi.y + semi.height / 2).not.toBe(center)
  })

  it('линии всё равно строятся между уровнями', () => {
    expect(stacked().links).toHaveLength(6)
  })

  it('groupGap разводит ветки, оставляя пару вместе', () => {
    const layout = layoutTree(toTree(data), {
      nodeWidth: 100,
      nodeHeight: 50,
      levelGap: 20,
      siblingGap: 10,
      groupGap: 40,
      direction: 'right-to-left',
      levelLayout: 'stack',
    })
    const y = (id: string) => layout.nodes.find((node) => node.id === id)!.y

    // q1+q2 сходятся в один полуфинал — между ними тесно.
    expect(y('q2') - (y('q1') + 50)).toBe(10)
    // q3 уже из другой ветки — промежуток крупнее.
    expect(y('q3') - (y('q2') + 50)).toBe(40)
    expect(y('q4') - (y('q3') + 50)).toBe(10)
  })

  it('без groupGap уровень идёт ровным шагом', () => {
    const layout = stacked()
    const y = (id: string) => layout.nodes.find((node) => node.id === id)!.y

    expect([y('q2') - y('q1'), y('q3') - y('q2'), y('q4') - y('q3')]).toEqual([60, 60, 60])
  })
})
