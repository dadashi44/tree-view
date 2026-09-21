import type { TreeNode } from './types'

/**
 * Как читать чужие данные.
 * Любую из функций можно не передавать — тогда работает поведение по умолчанию.
 */
export interface Accessors<T> {
  /** Идентификатор узла. По умолчанию — поле `id`, а если его нет — путь вида `"0.1.2"`. */
  getId?: (item: T) => string | number | null | undefined
  /** Дети узла. По умолчанию — поле `children`. */
  getChildren?: (item: T) => T[] | null | undefined
  /**
   * Идентификатор родителя. Если передан — данные считаются
   * ПЛОСКИМ списком (`[{ id, parentId }, ...]`), а не вложенным деревом.
   */
  getParentId?: (item: T) => string | number | null | undefined
}

/** Читает `item.children`, если пользователь не задал свой аксессор. */
function defaultGetChildren<T>(item: T): T[] | null | undefined {
  return (item as { children?: T[] })?.children
}

/** Читает `item.id`, если пользователь не задал свой аксессор. */
function defaultGetId<T>(item: T): string | number | null | undefined {
  return (item as { id?: string | number })?.id
}

/**
 * Превращает входные данные в массив корней дерева.
 *
 * Поддерживает два формата:
 * 1. Вложенный:  `{ id: 1, children: [...] }` или массив таких объектов;
 * 2. Плоский:    `[{ id: 2, parentId: 1 }, ...]` — включается передачей `getParentId`.
 */
export function toTree<T>(input: T | T[] | null | undefined, accessors: Accessors<T> = {}): TreeNode<T>[] {
  if (input == null) return []

  const items = Array.isArray(input) ? input : [input]
  if (items.length === 0) return []

  return accessors.getParentId
    ? fromFlatList(items, accessors as Accessors<T> & { getParentId: NonNullable<Accessors<T>['getParentId']> })
    : fromNested(items, accessors)
}

/** Вложенный формат: рекурсивно обходим `children`. */
function fromNested<T>(items: T[], accessors: Accessors<T>): TreeNode<T>[] {
  const getId = accessors.getId ?? defaultGetId
  const getChildren = accessors.getChildren ?? defaultGetChildren
  const usedIds = new Set<string>()

  /** `path` — запасной идентификатор: он стабилен, пока не меняется порядок данных. */
  function build(item: T, depth: number, parentId: string | null, path: string): TreeNode<T> {
    const id = toId(getId(item), path)
    assertUniqueId(id, usedIds)

    const rawChildren = getChildren(item) ?? []
    const children = rawChildren.map((child, index) => build(child, depth + 1, id, `${path}.${index}`))

    return { id, data: item, depth, parentId, children, hasChildren: children.length > 0, collapsed: false }
  }

  return items.map((item, index) => build(item, 0, null, String(index)))
}

/** Плоский формат: собираем детей по `parentId`. */
function fromFlatList<T>(
  items: T[],
  accessors: Accessors<T> & { getParentId: NonNullable<Accessors<T>['getParentId']> },
): TreeNode<T>[] {
  const getId = accessors.getId ?? defaultGetId
  const usedIds = new Set<string>()

  // Шаг 1: заготовки узлов без связей.
  const nodes = items.map((item, index) => {
    const id = toId(getId(item), String(index))
    assertUniqueId(id, usedIds)
    return { id, data: item, depth: 0, parentId: null, children: [], hasChildren: false, collapsed: false } as TreeNode<T>
  })

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const roots: TreeNode<T>[] = []

  // Шаг 2: каждого ребёнка кладём в массив его родителя.
  nodes.forEach((node, index) => {
    const rawParentId = accessors.getParentId(items[index]!)
    const parent = rawParentId == null ? undefined : byId.get(String(rawParentId))

    if (!parent) {
      roots.push(node)
      return
    }
    node.parentId = parent.id
    parent.children.push(node)
    parent.hasChildren = true
  })

  // Шаг 3: считаем глубину сверху вниз. Заодно ловим циклы (A → B → A).
  const visited = setDepths(roots)
  if (visited !== nodes.length) {
    throw new Error('[tree-view] В данных есть цикл: часть узлов ссылается друг на друга по кругу.')
  }

  return roots
}

/** Проставляет `depth` обходом в ширину и возвращает число посещённых узлов. */
function setDepths<T>(roots: TreeNode<T>[]): number {
  const queue = [...roots]
  let visited = 0

  while (queue.length > 0) {
    const node = queue.shift()!
    visited += 1
    for (const child of node.children) {
      child.depth = node.depth + 1
      queue.push(child)
    }
  }
  return visited
}

/** Приводит идентификатор к строке, подставляя путь, если его нет. */
function toId(rawId: string | number | null | undefined, fallback: string): string {
  return rawId == null || rawId === '' ? fallback : String(rawId)
}

/** Одинаковые id ломают отрисовку молча — лучше сразу сказать об этом вслух. */
function assertUniqueId(id: string, usedIds: Set<string>): void {
  if (usedIds.has(id)) {
    throw new Error(`[tree-view] Повторяющийся id узла: "${id}". Идентификаторы должны быть уникальными.`)
  }
  usedIds.add(id)
}
