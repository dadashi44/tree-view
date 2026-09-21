import {
  DEFAULT_SCALE_LIMITS,
  IDENTITY_TRANSFORM,
  fitToViewport,
  panBy,
  zoomAtPoint,
  type ScaleLimits,
} from './viewport'
import type { Size, Transform } from './types'

/** Во сколько раз меняется масштаб за одно движение колеса или клик по кнопке. */
export const ZOOM_STEP = 1.2

export interface PanZoomParams {
  /** Можно ли двигать холст. По умолчанию да. */
  pannable?: () => boolean
  /** Можно ли менять масштаб. По умолчанию да. */
  zoomable?: () => boolean
  /** Пределы масштаба. */
  limits?: () => ScaleLimits
  /** Вызывается после каждого изменения — здесь фреймворк обновляет свой state. */
  onChange: (transform: Transform) => void
}

/**
 * Перетаскивание и зум без привязки к фреймворку: и Vue 2, и Vue 3, и что угодно
 * ещё просто создают контроллер и подписываются на `onChange`.
 *
 * Слушаем pointer-события — они одинаково работают мышью и пальцем,
 * поэтому отдельного кода для мобильных не нужно.
 */
export class PanZoomController {
  transform: Transform = { ...IDENTITY_TRANSFORM }

  private element: HTMLElement | null = null
  /** Активные касания: id указателя → последняя позиция на экране. */
  private readonly pointers = new Map<number, { x: number; y: number }>()
  /** Расстояние между двумя пальцами на прошлом событии — для «щипка». */
  private lastPinchDistance = 0

  constructor(private readonly params: PanZoomParams) {}

  /** Подписывается на события элемента. Повторный вызов сначала отписывается. */
  attach(element: HTMLElement): void {
    this.detach()
    this.element = element

    element.addEventListener('pointerdown', this.onPointerDown)
    element.addEventListener('pointermove', this.onPointerMove)
    element.addEventListener('pointerup', this.onPointerUp)
    element.addEventListener('pointercancel', this.onPointerUp)
    // passive: false — иначе браузер не даст отменить прокрутку страницы.
    element.addEventListener('wheel', this.onWheel, { passive: false })
  }

  /** Снимает все слушатели. Обязательно вызывать при размонтировании. */
  detach(): void {
    const element = this.element
    if (!element) return

    element.removeEventListener('pointerdown', this.onPointerDown)
    element.removeEventListener('pointermove', this.onPointerMove)
    element.removeEventListener('pointerup', this.onPointerUp)
    element.removeEventListener('pointercancel', this.onPointerUp)
    element.removeEventListener('wheel', this.onWheel)

    this.element = null
    this.pointers.clear()
    this.lastPinchDistance = 0
  }

  /** Вписывает содержимое в размер элемента и центрирует. */
  fit(content: Size, padding = 24): void {
    const element = this.element
    if (!element) return

    this.set(
      fitToViewport(
        content,
        { width: element.clientWidth, height: element.clientHeight },
        padding,
        this.limits,
      ),
    )
  }

  zoomIn(): void {
    this.zoomToCenter(ZOOM_STEP)
  }

  zoomOut(): void {
    this.zoomToCenter(1 / ZOOM_STEP)
  }

  reset(): void {
    this.set({ ...IDENTITY_TRANSFORM })
  }

  /** Устанавливает состояние напрямую (например, восстановление после перезагрузки). */
  set(transform: Transform): void {
    this.transform = { ...transform }
    this.params.onChange(this.transform)
  }

  private get limits(): ScaleLimits {
    return this.params.limits?.() ?? DEFAULT_SCALE_LIMITS
  }

  private isPannable(): boolean {
    return this.params.pannable?.() ?? true
  }

  private isZoomable(): boolean {
    return this.params.zoomable?.() ?? true
  }

  /** Переводит координаты экрана в координаты внутри элемента. */
  private toLocalPoint(point: { clientX: number; clientY: number }) {
    const rect = this.element?.getBoundingClientRect()
    return { x: point.clientX - (rect?.left ?? 0), y: point.clientY - (rect?.top ?? 0) }
  }

  private zoomToCenter(factor: number): void {
    const element = this.element
    const center = { x: (element?.clientWidth ?? 0) / 2, y: (element?.clientHeight ?? 0) / 2 }
    this.set(zoomAtPoint(this.transform, factor, center, this.limits))
  }

  // Стрелочные функции — чтобы `this` оставался контроллером и чтобы
  // removeEventListener получил ту же самую ссылку на обработчик.

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isPannable()) return
    // Элементу с атрибутом data-tv-no-pan разрешаем свои жесты (кнопки, инпуты).
    if ((event.target as HTMLElement | null)?.closest?.('[data-tv-no-pan]')) return

    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    this.element?.setPointerCapture?.(event.pointerId)
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const previous = this.pointers.get(event.pointerId)
    if (!previous) return

    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (this.pointers.size === 2) {
      this.pinch()
      return
    }

    this.set(panBy(this.transform, event.clientX - previous.x, event.clientY - previous.y))
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId)
    if (this.pointers.size < 2) this.lastPinchDistance = 0
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.isZoomable()) return
    event.preventDefault()

    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
    this.set(zoomAtPoint(this.transform, factor, this.toLocalPoint(event), this.limits))
  }

  /** Два пальца: масштабируем вокруг точки ровно между ними. */
  private pinch(): void {
    if (!this.isZoomable()) return

    const [first, second] = [...this.pointers.values()]
    if (!first || !second) return

    const distance = Math.hypot(first.x - second.x, first.y - second.y)

    if (this.lastPinchDistance > 0 && distance > 0) {
      const middle = this.toLocalPoint({
        clientX: (first.x + second.x) / 2,
        clientY: (first.y + second.y) / 2,
      })
      this.set(zoomAtPoint(this.transform, distance / this.lastPinchDistance, middle, this.limits))
    }

    this.lastPinchDistance = distance
  }
}
