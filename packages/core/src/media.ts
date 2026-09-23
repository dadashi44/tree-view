/**
 * Подписка на медиавыражение — чтобы компоненты не писали работу с
 * `matchMedia` дважды и одинаково вели себя на сервере.
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
