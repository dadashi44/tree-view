import { computed, ref, type ComputedRef } from 'vue'
import {
  applyCollapsed,
  layoutTree,
  toggleCollapsed,
  toTree,
  type Accessors,
  type Layout,
  type TreeViewOptions,
} from '@dadashi/tree-view-core'

/** Функции-геттеры, чтобы композабл видел свежие значения пропов. */
export interface UseTreeLayoutParams<T> {
  data: () => T | T[] | null | undefined
  options: () => Partial<TreeViewOptions> | undefined
  accessors: () => Accessors<T>
}

export interface UseTreeLayoutResult<T> {
  /** Готовая раскладка: узлы с координатами и линии. */
  layout: ComputedRef<Layout<T>>
  /** Свёрнут ли узел с таким id. */
  isCollapsed: (id: string) => boolean
  /** Свернуть/развернуть узел. */
  toggle: (id: string) => void
  /** Развернуть всё дерево. */
  expandAll: () => void
}

/**
 * Вся «логика» компонента: данные → дерево → раскладка.
 * Каждый шаг — отдельная чистая функция из core, здесь только реактивность.
 */
export function useTreeLayout<T>(params: UseTreeLayoutParams<T>): UseTreeLayoutResult<T> {
  const collapsedIds = ref(new Set<string>())

  const tree = computed(() => toTree(params.data(), params.accessors()))
  const visibleTree = computed(() => applyCollapsed(tree.value, collapsedIds.value))
  const layout = computed(() => layoutTree(visibleTree.value, params.options()))

  function isCollapsed(id: string): boolean {
    return collapsedIds.value.has(id)
  }

  function toggle(id: string): void {
    // Новое множество вместо мутации — иначе Vue не заметит изменения.
    collapsedIds.value = toggleCollapsed(collapsedIds.value, id)
  }

  function expandAll(): void {
    collapsedIds.value = new Set()
  }

  return { layout, isCollapsed, toggle, expandAll }
}
