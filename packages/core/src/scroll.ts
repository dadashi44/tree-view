/**
 * Плавная прокрутка к раунду.
 *
 * Полоса раундов не знает, кто её прокручивает: на странице турнира это блок
 * с `overflow-x: auto` вокруг сетки. Поэтому нужный блок ищется по дереву вверх.
 *
 * Двигаем только по горизонтали. Вертикаль не трогаем специально: страница
 * должна остаться там, где её оставил пользователь, — иначе сетка «прыгает»
 * под руками просто от нажатия на раунд.
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

/** Горизонтальное место элемента внутри прокручиваемого блока. */
export function horizontalBox(
  element: HTMLElement,
  container: HTMLElement,
): { left: number; width: number } {
  return { left: offsetWithin(element, container), width: element.getBoundingClientRect().width }
}

/** Класс, которым помечается скрытое: карточка или линия пройденного раунда. */
export const HIDDEN_CLASS = 'tv-hidden'

/**
 * Прячет всё, что относится к раундам левее текущего: и карточки, и линии,
 * которые из них выходят. Работает по атрибуту `data-depth`, который сетка
 * ставит на карточки и линии.
 *
 * Прячем видимостью, а не удалением: раскладка остаётся на месте, поэтому
 * прокрутка и точки прилипания не съезжают под пальцем.
 */
export function hideRoundsBefore(
  content: HTMLElement,
  index: number,
  roundOf: (depth: number) => number,
): void {
  content.querySelectorAll<HTMLElement>('[data-depth]').forEach((element) => {
    const depth = Number(element.getAttribute('data-depth'))

    element.classList.toggle(HIDDEN_CLASS, roundOf(depth) < index)
  })
}
