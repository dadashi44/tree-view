/**
 * Плавная прокрутка к раунду.
 *
 * Полоса раундов не знает, кто её прокручивает: на странице турнира это блок
 * с `overflow-x: auto` вокруг сетки. Поэтому нужный блок ищется по дереву вверх.
 */

/**
 * Ближайший предок, который реально прокручивается по горизонтали.
 * Не нашли — значит прокручивать нечего.
 */
export function findScrollParent(element: HTMLElement | null | undefined): HTMLElement | null {
  if (typeof window === 'undefined') return null

  let current = element?.parentElement ?? null

  while (current) {
    const { overflowX } = window.getComputedStyle(current)
    const scrolls = overflowX === 'auto' || overflowX === 'scroll'

    if (scrolls && current.scrollWidth > current.clientWidth) return current

    current = current.parentElement
  }

  return null
}

/**
 * Прокручивает блок по горизонтали.
 * Плавно, а где `scrollTo` не поддержан — сразу.
 */
export function smoothScrollLeft(element: HTMLElement, left: number): void {
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ left, behavior: 'smooth' })
    return
  }

  element.scrollLeft = left
}

/**
 * Насколько левый край элемента сдвинут относительно начала содержимого
 * прокручиваемого блока. С этой точки и отсчитываются колонки раундов.
 */
export function offsetWithin(element: HTMLElement, container: HTMLElement): number {
  return (
    element.getBoundingClientRect().left -
    container.getBoundingClientRect().left +
    container.scrollLeft
  )
}

/** Класс карточки в сетке — по нему полоса находит матчи раунда. */
export const TREE_NODE_SELECTOR = '.tree-view__node'

/**
 * Карточки сетки, попавшие в колонку раунда.
 *
 * Колонки одинаковой ширины и идут подряд, поэтому номер раунда получается
 * делением: центр карточки делим на ширину колонки. Пусто — значит сетка
 * эти карточки не нарисовала (виртуализация) или рисует их по-своему.
 */
export function nodesInColumn(
  content: HTMLElement,
  index: number,
  width: number,
  offset: number,
): HTMLElement[] {
  // Сетка начинается после отступа, центрующего матчи внутри раундов.
  const origin = content.getBoundingClientRect().left + offset
  const nodes = Array.from(content.querySelectorAll<HTMLElement>(TREE_NODE_SELECTOR))

  return nodes.filter((node) => {
    const rect = node.getBoundingClientRect()

    return Math.floor((rect.left + rect.width / 2 - origin) / width) === index
  })
}

/**
 * Плавно подводит карточку к центру экрана — и по горизонтали, и по вертикали.
 * Возвращает `false`, если браузер так не умеет: тогда остаётся ручной расчёт.
 */
export function scrollToNode(node: HTMLElement): boolean {
  if (typeof node.scrollIntoView !== 'function') return false

  node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  return true
}
