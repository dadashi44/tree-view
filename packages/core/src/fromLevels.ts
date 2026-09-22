import type { TreeNode } from './types'

export interface FromLevelsOptions<T> {
  /** Идентификатор узла. По умолчанию — поле `id`, иначе «номер уровня.номер в уровне». */
  getId?: (item: T, level: number, index: number) => string | number | null | undefined
}

/**
 * Собирает дерево из «уровней», когда в данных нет ссылок на родителя,
 * а связь задана только позицией — так устроены bounty-сетки: пары групп
 * одного раунда сходятся в одну группу следующего.
 *
 * Уровни передаются от самого раннего раунда к финалу:
 *
 * ```ts
 * fromLevels([
 *   [g1, g2, g3, g4],  // первый раунд
 *   [g5, g6],          // второй: g1+g2 → g5, g3+g4 → g6
 *   [g7],              // финал: g5+g6 → g7
 * ])
 * ```
 *
 * Если уровни делятся неровно (например 5 групп на 2), лишние узлы
 * достаются последнему родителю — так же, как это выглядит в вёрстке.
 */
export function fromLevels<T>(levels: T[][], options: FromLevelsOptions<T> = {}): TreeNode<T>[] {
  const filled = levels.filter((level) => level.length > 0)
  if (filled.length === 0) return []

  const lastLevel = filled.length - 1

  // Сначала создаём узлы всех уровней, связи проставим следующим шагом.
  const nodes: TreeNode<T>[][] = filled.map((level, levelIndex) =>
    level.map((item, index) => ({
      id: resolveId(item, levelIndex, index, options.getId),
      data: item,
      // Финал — корень, поэтому глубина считается от последнего уровня.
      depth: lastLevel - levelIndex,
      parentId: null,
      children: [],
      hasChildren: false,
      collapsed: false,
    })),
  )

  for (let levelIndex = 0; levelIndex < lastLevel; levelIndex += 1) {
    const current = nodes[levelIndex]!
    const parents = nodes[levelIndex + 1]!
    // Сколько узлов этого уровня приходится на одного родителя.
    const perParent = Math.ceil(current.length / parents.length)

    current.forEach((node, index) => {
      const parent = parents[Math.min(Math.floor(index / perParent), parents.length - 1)]!
      node.parentId = parent.id
      parent.children.push(node)
      parent.hasChildren = true
    })
  }

  return nodes[lastLevel]!
}

function resolveId<T>(
  item: T,
  level: number,
  index: number,
  getId: FromLevelsOptions<T>['getId'],
): string {
  const raw = getId ? getId(item, level, index) : (item as { id?: string | number })?.id
  return raw == null || raw === '' ? `${level}.${index}` : String(raw)
}
