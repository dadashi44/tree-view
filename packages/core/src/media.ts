/**
 * Подписки на размер экрана и блока — чтобы компоненты не писали работу с
 * `matchMedia` и `ResizeObserver` дважды и одинаково вели себя на сервере.
 */

/** Узкий экран: ниже этой ширины раунды показываются табами. */
export const MOBILE_MEDIA_QUERY = '(max-width: 768px)'

/**
 * Следит за медиавыражением и сразу сообщает текущее значение.
 * Возвращает функцию отписки.
 *
 * На сервере (SSR) ничего не делает: там нет `window`, а после гидрации
 * подписка появится вместе с компонентом.
 */
export function watchMedia(query: string, onChange: (matches: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}

  const media = window.matchMedia(query)
  const listener = () => onChange(media.matches)

  listener()

  // addEventListener появился не сразу: в старых Safari есть только addListener.
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }

  media.addListener(listener)
  return () => media.removeListener(listener)
}

/**
 * Следит за шириной блока и сразу сообщает текущую.
 * Возвращает функцию отписки. На сервере ничего не делает.
 */
export function watchWidth(
  element: HTMLElement | null | undefined,
  onChange: (width: number) => void,
): () => void {
  if (!element) return () => {}

  onChange(element.clientWidth)

  // Без ResizeObserver останется первая ширина — это лучше, чем ничего.
  if (typeof ResizeObserver === 'undefined') return () => {}

  const observer = new ResizeObserver(() => onChange(element.clientWidth))
  observer.observe(element)

  return () => observer.disconnect()
}

/**
 * Следит за тем, как меняется содержимое блока: сетка перерисовывает карточки
 * при новых данных и при виртуализации, и скрытое приходится расставлять заново.
 *
 * Смотрим только на состав детей — на изменения классов не реагируем,
 * иначе собственная правка классов запускала бы бесконечный круг.
 */
export function watchChildren(
  element: HTMLElement | null | undefined,
  onChange: () => void,
): () => void {
  if (!element || typeof MutationObserver === 'undefined') return () => {}

  const observer = new MutationObserver(onChange)
  observer.observe(element, { childList: true, subtree: true })

  return () => observer.disconnect()
}
