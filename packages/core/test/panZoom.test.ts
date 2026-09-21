// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanZoomController } from '../src/panZoom'
import type { Transform } from '../src/types'

/** Создаёт элемент с «настоящими» размерами — в тестовой среде их надо задать руками. */
function createElement(width = 400, height = 300): HTMLElement {
  const element = document.createElement('div')
  document.body.appendChild(element)

  Object.defineProperty(element, 'clientWidth', { value: width })
  Object.defineProperty(element, 'clientHeight', { value: height })
  element.getBoundingClientRect = () => ({ left: 0, top: 0, width, height }) as DOMRect

  return element
}

function pointer(type: string, init: { pointerId?: number; clientX?: number; clientY?: number } = {}): Event {
  const event = new Event(type, { bubbles: true })
  Object.assign(event, { pointerId: 1, clientX: 0, clientY: 0 }, init)
  return event
}

describe('PanZoomController', () => {
  let element: HTMLElement
  let changes: Transform[]
  let controller: PanZoomController

  beforeEach(() => {
    element = createElement()
    changes = []
    controller = new PanZoomController({ onChange: (transform) => changes.push(transform) })
    controller.attach(element)
  })

  it('перетаскивание сдвигает холст', () => {
    element.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }))
    element.dispatchEvent(pointer('pointermove', { clientX: 40, clientY: 30 }))

    expect(controller.transform).toMatchObject({ x: 30, y: 20, scale: 1 })
  })

  it('без pointerdown движение мыши ничего не двигает', () => {
    element.dispatchEvent(pointer('pointermove', { clientX: 40, clientY: 30 }))
    expect(controller.transform.x).toBe(0)
  })

  it('после pointerup перетаскивание прекращается', () => {
    element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }))
    element.dispatchEvent(pointer('pointerup', { clientX: 0, clientY: 0 }))
    element.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 50 }))

    expect(controller.transform.x).toBe(0)
  })

  it('pannable: false выключает перетаскивание', () => {
    controller.detach()
    controller = new PanZoomController({ pannable: () => false, onChange: () => {} })
    controller.attach(element)

    element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }))
    element.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 50 }))

    expect(controller.transform.x).toBe(0)
  })

  it('элемент с data-tv-no-pan не начинает перетаскивание', () => {
    const button = document.createElement('button')
    button.setAttribute('data-tv-no-pan', '')
    element.appendChild(button)

    button.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }))
    element.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 50 }))

    expect(controller.transform.x).toBe(0)
  })

  it('колесо вверх увеличивает масштаб и отменяет прокрутку страницы', () => {
    const event = new Event('wheel', { bubbles: true, cancelable: true })
    Object.assign(event, { deltaY: -100, clientX: 0, clientY: 0 })

    element.dispatchEvent(event)

    expect(controller.transform.scale).toBeCloseTo(1.2)
    expect(event.defaultPrevented).toBe(true)
  })

  it('колесо вниз уменьшает масштаб', () => {
    const event = new Event('wheel', { bubbles: true, cancelable: true })
    Object.assign(event, { deltaY: 100, clientX: 0, clientY: 0 })

    element.dispatchEvent(event)

    expect(controller.transform.scale).toBeCloseTo(1 / 1.2)
  })

  it('zoomable: false выключает колесо', () => {
    controller.detach()
    controller = new PanZoomController({ zoomable: () => false, onChange: () => {} })
    controller.attach(element)

    const event = new Event('wheel', { bubbles: true, cancelable: true })
    Object.assign(event, { deltaY: -100, clientX: 0, clientY: 0 })
    element.dispatchEvent(event)

    expect(controller.transform.scale).toBe(1)
  })

  it('два пальца масштабируют «щипком»', () => {
    element.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }))
    element.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 200, clientY: 100 }))
    // Первое движение только запоминает расстояние между пальцами.
    element.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 200, clientY: 100 }))
    // Второе — разводит пальцы вдвое дальше.
    element.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 300, clientY: 100 }))

    expect(controller.transform.scale).toBeCloseTo(2)
  })

  it('fit вписывает содержимое в элемент', () => {
    controller.fit({ width: 800, height: 600 }, 0)

    expect(controller.transform.scale).toBeCloseTo(0.5)
    expect(controller.transform.x).toBe(0)
  })

  it('zoomIn/zoomOut/reset работают от центра', () => {
    controller.zoomIn()
    expect(controller.transform.scale).toBeCloseTo(1.2)

    controller.zoomOut()
    expect(controller.transform.scale).toBeCloseTo(1)

    controller.set({ x: 5, y: 5, scale: 2 })
    controller.reset()
    expect(controller.transform).toEqual({ x: 0, y: 0, scale: 1 })
  })

  it('сообщает об изменениях через onChange', () => {
    controller.zoomIn()
    expect(changes).toHaveLength(1)
    expect(changes[0]!.scale).toBeCloseTo(1.2)
  })

  it('detach отписывается от событий', () => {
    const remove = vi.spyOn(element, 'removeEventListener')

    controller.detach()
    element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }))
    element.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 50 }))

    expect(remove).toHaveBeenCalled()
    expect(controller.transform.x).toBe(0)
  })
})
