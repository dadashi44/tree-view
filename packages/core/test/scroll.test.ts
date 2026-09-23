// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import {
  HIDDEN_CLASS,
  findScrollParent,
  hideRoundsBefore,
  horizontalBox,
  nodesInColumn,
  offsetWithin,
  smoothScrollLeft,
} from '../src/scroll'

/** Блок с горизонтальной прокруткой: в happy-dom размеры задаются руками. */
function scrollable(scrollWidth = 1000, clientWidth = 500): HTMLElement {
  const element = document.createElement('div')
  element.style.overflowX = 'auto'
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth })
  Object.defineProperty(element, 'clientWidth', { value: clientWidth })
  // Отсоединённым элементам happy-dom не считает стили — вешаем в документ.
  document.body.appendChild(element)

  return element
}

describe('findScrollParent', () => {
  it('находит ближайший прокручиваемый блок', () => {
    const container = scrollable()
    const child = document.createElement('div')
    container.appendChild(child)

    expect(findScrollParent(child)).toBe(container)
  })

  it('блок без прокрутки пропускает', () => {
    const outer = scrollable()
    const middle = document.createElement('div')
    const child = document.createElement('div')
    outer.appendChild(middle)
    middle.appendChild(child)

    expect(findScrollParent(child)).toBe(outer)
  })

  it('содержимое влезает целиком — прокручивать нечего', () => {
    const container = scrollable(500, 500)
    const child = document.createElement('div')
    container.appendChild(child)

    expect(findScrollParent(child)).toBeNull()
  })

  it('элемента нет — и предка тоже', () => {
    expect(findScrollParent(null)).toBeNull()
  })
})

describe('smoothScrollLeft', () => {
  it('прокручивает плавно, если браузер умеет', () => {
    const element = document.createElement('div')
    element.scrollTo = vi.fn()

    smoothScrollLeft(element, 120)

    expect(element.scrollTo).toHaveBeenCalledWith({ left: 120, behavior: 'smooth' })
  })

  it('не умеет — прокручивает сразу', () => {
    const element = document.createElement('div')
    // @ts-expect-error проверяем поведение в браузере без scrollTo
    element.scrollTo = undefined

    smoothScrollLeft(element, 120)

    expect(element.scrollLeft).toBe(120)
  })
})

describe('offsetWithin', () => {
  it('учитывает уже прокрученное расстояние', () => {
    const container = document.createElement('div')
    const element = document.createElement('div')
    container.appendChild(element)

    container.getBoundingClientRect = () => ({ left: 10 }) as DOMRect
    element.getBoundingClientRect = () => ({ left: 30 }) as DOMRect
    container.scrollLeft = 100

    expect(offsetWithin(element, container)).toBe(120)
  })
})

describe('nodesInColumn', () => {
  /** Сетка из трёх раундов: карточки по 211 с шагом 250 после отступа 19.5. */
  function grid(): HTMLElement {
    const content = document.createElement('div')
    content.getBoundingClientRect = () => ({ left: 0 }) as DOMRect

    for (const [index, left] of [19.5, 19.5, 269.5, 519.5].entries()) {
      const node = document.createElement('div')
      node.className = 'tree-view__node'
      node.dataset.index = String(index)
      node.getBoundingClientRect = () => ({ left, width: 211 }) as DOMRect
      content.appendChild(node)
    }

    return content
  }

  it('находит карточки нужного раунда', () => {
    const found = nodesInColumn(grid(), 0, 250, 19.5)

    // Первые две карточки стоят в первом раунде друг под другом.
    expect(found.map((node) => node.dataset.index)).toEqual(['0', '1'])
  })

  it('последний раунд — финал', () => {
    expect(nodesInColumn(grid(), 2, 250, 19.5).map((node) => node.dataset.index)).toEqual(['3'])
  })

  it('раунда нет на экране — пусто', () => {
    expect(nodesInColumn(grid(), 5, 250, 19.5)).toEqual([])
  })
})

describe('horizontalBox', () => {
  it('отдаёт место карточки внутри прокручиваемого блока', () => {
    const container = document.createElement('div')
    const card = document.createElement('div')
    container.appendChild(card)

    container.getBoundingClientRect = () => ({ left: 10 }) as DOMRect
    card.getBoundingClientRect = () => ({ left: 30, width: 211 }) as DOMRect
    container.scrollLeft = 100

    expect(horizontalBox(card, container)).toEqual({ left: 120, width: 211 })
  })
})

describe('hideRoundsBefore', () => {
  /** Сетка из трёх раундов справа налево: первый раунд — глубина 2. */
  function grid(): HTMLElement {
    const content = document.createElement('div')

    for (const depth of [2, 2, 1, 0]) {
      const node = document.createElement('div')
      node.setAttribute('data-depth', String(depth))
      content.appendChild(node)
    }

    return content
  }

  const roundOf = (depth: number) => 2 - depth
  const hidden = (content: HTMLElement) =>
    Array.from(content.children)
      .filter((node) => node.classList.contains(HIDDEN_CLASS))
      .map((node) => node.getAttribute('data-depth'))

  it('на первом раунде не прячет ничего', () => {
    const content = grid()
    hideRoundsBefore(content, 0, roundOf)

    expect(hidden(content)).toEqual([])
  })

  it('на втором раунде прячет первый — вместе с его линиями', () => {
    const content = grid()
    hideRoundsBefore(content, 1, roundOf)

    expect(hidden(content)).toEqual(['2', '2'])
  })

  it('на финале остаётся только он', () => {
    const content = grid()
    hideRoundsBefore(content, 2, roundOf)

    expect(hidden(content)).toEqual(['2', '2', '1'])
  })

  it('возврат назад снимает скрытие', () => {
    const content = grid()
    hideRoundsBefore(content, 2, roundOf)
    hideRoundsBefore(content, 0, roundOf)

    expect(hidden(content)).toEqual([])
  })
})
