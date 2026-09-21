import { describe, expect, it } from 'vitest'
import {
  clamp,
  fitToViewport,
  panBy,
  toCssTransform,
  zoomAtPoint,
  IDENTITY_TRANSFORM,
} from '../src/viewport'

describe('clamp', () => {
  it('держит число в границах', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('fitToViewport', () => {
  it('уменьшает масштаб, если содержимое больше окна', () => {
    const transform = fitToViewport({ width: 1000, height: 500 }, { width: 548, height: 1000 }, 24)
    expect(transform.scale).toBeCloseTo(0.5)
  })

  it('центрирует содержимое', () => {
    const transform = fitToViewport({ width: 100, height: 100 }, { width: 500, height: 300 }, 0)

    expect(transform.scale).toBe(1)
    expect(transform.x).toBe(200)
    expect(transform.y).toBe(100)
  })

  it('не увеличивает мелкое дерево (масштаб не больше 1)', () => {
    expect(fitToViewport({ width: 10, height: 10 }, { width: 1000, height: 1000 }).scale).toBe(1)
  })

  it('уважает минимальный масштаб', () => {
    const transform = fitToViewport({ width: 100000, height: 100 }, { width: 100, height: 100 }, 0, {
      min: 0.5,
      max: 2,
    })
    expect(transform.scale).toBe(0.5)
  })

  it('на пустом содержимом возвращает исходное состояние', () => {
    expect(fitToViewport({ width: 0, height: 0 }, { width: 100, height: 100 })).toEqual(IDENTITY_TRANSFORM)
  })
})

describe('panBy', () => {
  it('складывает сдвиги и не трогает масштаб', () => {
    expect(panBy({ x: 10, y: 10, scale: 2 }, 5, -5)).toEqual({ x: 15, y: 5, scale: 2 })
  })
})

describe('zoomAtPoint', () => {
  it('точка под курсором остаётся на месте', () => {
    const before = { x: 30, y: 60, scale: 1 }
    const cursor = { x: 200, y: 150 }

    const after = zoomAtPoint(before, 1.5, cursor)

    const contentPointBefore = { x: (cursor.x - before.x) / before.scale, y: (cursor.y - before.y) / before.scale }
    const screenPointAfter = {
      x: contentPointBefore.x * after.scale + after.x,
      y: contentPointBefore.y * after.scale + after.y,
    }

    expect(screenPointAfter.x).toBeCloseTo(cursor.x)
    expect(screenPointAfter.y).toBeCloseTo(cursor.y)
  })

  it('не выходит за пределы масштаба', () => {
    expect(zoomAtPoint({ x: 0, y: 0, scale: 2.9 }, 2, { x: 0, y: 0 }, { min: 0.2, max: 3 }).scale).toBe(3)
    expect(zoomAtPoint({ x: 0, y: 0, scale: 0.25 }, 0.1, { x: 0, y: 0 }, { min: 0.2, max: 3 }).scale).toBe(0.2)
  })

  it('на упёртом в предел масштабе возвращает тот же объект', () => {
    const transform = { x: 0, y: 0, scale: 3 }
    expect(zoomAtPoint(transform, 1.2, { x: 0, y: 0 })).toBe(transform)
  })
})

describe('toCssTransform', () => {
  it('собирает строку для CSS', () => {
    expect(toCssTransform({ x: 10, y: -5, scale: 1.5 })).toBe('translate(10px, -5px) scale(1.5)')
  })
})
