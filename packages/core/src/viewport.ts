import type { Point, Size, Transform } from './types'

/** Ограничения зума. */
export interface ScaleLimits {
  min: number
  max: number
}

export const DEFAULT_SCALE_LIMITS: ScaleLimits = { min: 0.2, max: 3 }

/** Начальное состояние холста: ничего не сдвинуто, масштаб 1. */
export const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, scale: 1 }

/** Зажимает число в диапазоне [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Подбирает масштаб и сдвиг так, чтобы всё дерево влезло в видимую область
 * и оказалось по центру. `padding` — отступ от краёв в пикселях.
 */
export function fitToViewport(
  content: Size,
  viewport: Size,
  padding = 24,
  limits: ScaleLimits = DEFAULT_SCALE_LIMITS,
): Transform {
  if (content.width <= 0 || content.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { ...IDENTITY_TRANSFORM }
  }

  const availableWidth = Math.max(viewport.width - padding * 2, 1)
  const availableHeight = Math.max(viewport.height - padding * 2, 1)
  // Берём меньший из двух коэффициентов — иначе дерево вылезет за край.
  const raw = Math.min(availableWidth / content.width, availableHeight / content.height, 1)
  const scale = clamp(raw, limits.min, limits.max)

  return {
    scale,
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
  }
}

/** Сдвигает холст на `dx`/`dy` пикселей экрана. */
export function panBy(transform: Transform, dx: number, dy: number): Transform {
  return { ...transform, x: transform.x + dx, y: transform.y + dy }
}

/**
 * Меняет масштаб так, чтобы точка `point` (координаты экрана) осталась
 * под курсором — это и есть «зум к курсору».
 */
export function zoomAtPoint(
  transform: Transform,
  factor: number,
  point: Point,
  limits: ScaleLimits = DEFAULT_SCALE_LIMITS,
): Transform {
  const scale = clamp(transform.scale * factor, limits.min, limits.max)
  if (scale === transform.scale) return transform

  // Точка в координатах содержимого — она не должна поменяться.
  const contentX = (point.x - transform.x) / transform.scale
  const contentY = (point.y - transform.y) / transform.scale

  return { scale, x: point.x - contentX * scale, y: point.y - contentY * scale }
}

/** Готовая CSS-строка для `transform` холста. */
export function toCssTransform(transform: Transform): string {
  return `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
}
