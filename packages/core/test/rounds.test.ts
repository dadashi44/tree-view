import { describe, expect, it } from 'vitest'
import { buildBracketRounds, roundScrollLeft } from '../src/rounds'

const rounds = [
  { id: 1, name: '1/4' },
  { id: 2, name: '1/2' },
  { id: 3, name: 'Финал' },
]

/** Те же числа, что у сетки в песочнице. */
const options = { nodeWidth: 211, levelGap: 39 }

describe('buildBracketRounds', () => {
  it('делает по колонке на раунд', () => {
    const model = buildBracketRounds(rounds, options)

    expect(model.columns).toHaveLength(3)
    expect(model.columns[0]).toMatchObject({ key: '1', id: 1, name: '1/4', index: 0 })
    expect(model.columns[2]).toMatchObject({ key: '3', id: 3, name: 'Финал', index: 2 })
  })

  it('ширина колонки — шаг между уровнями сетки', () => {
    const model = buildBracketRounds(rounds, options)

    expect(model.columns.every((column) => column.width === 250)).toBe(true)
    expect(model.width).toBe(750)
  })

  it('отступ центрует матчи внутри раунда', () => {
    const { offset, columns } = buildBracketRounds(rounds, options)

    // Центр карточки после отступа совпадает с центром своей колонки.
    const cardCenter = offset + columns[1]!.width + options.nodeWidth / 2
    const columnCenter = columns[1]!.width * 1.5

    expect(cardCenter).toBe(columnCenter)
  })

  it('раунд без id получает порядковый номер', () => {
    const model = buildBracketRounds([{ name: 'Первый' }, { name: 'Второй' }], options)

    expect(model.columns.map((column) => column.id)).toEqual([0, 1])
  })

  it('раундов нет — нет и полосы', () => {
    expect(buildBracketRounds(null, options)).toMatchObject({ columns: [], width: 0 })
  })
})

describe('roundScrollLeft', () => {
  /** Полоса из четырёх колонок по 250 в блоке шириной 500. */
  const box = { width: 250, viewport: 500, scrollWidth: 1000 }

  it('ставит раунд по центру видимой части', () => {
    expect(roundScrollLeft({ ...box, left: 500 })).toBe(375)
  })

  it('у первых раундов упирается в левый край', () => {
    expect(roundScrollLeft({ ...box, left: 0 })).toBe(0)
  })

  it('у последних — в правый', () => {
    expect(roundScrollLeft({ ...box, left: 750 })).toBe(500)
  })

  it('содержимое влезло целиком — прокручивать некуда', () => {
    expect(roundScrollLeft({ ...box, left: 500, scrollWidth: 500 })).toBe(0)
  })
})
