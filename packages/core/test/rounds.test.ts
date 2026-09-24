import { describe, expect, it } from 'vitest'
import {
  buildBracketRounds,
  levelGapForWidth,
  roundAtScroll,
  roundOfDepth,
  roundSiblingGap,
  roundScrollLeft,
} from '../src/rounds'

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

describe('levelGapForWidth', () => {
  it('растягивает раунд на всю ширину блока', () => {
    const gap = levelGapForWidth(390, 211)
    const model = buildBracketRounds(rounds, { nodeWidth: 211, levelGap: gap })

    // Колонка раунда ровно с экран, карточка — по его центру.
    expect(model.columns[0]!.width).toBe(390)
    expect(model.offset).toBe((390 - 211) / 2)
  })

  it('карточка шире блока — промежутка не остаётся', () => {
    expect(levelGapForWidth(180, 211)).toBe(0)
  })

  it('ширину ещё не померили — тоже ноль', () => {
    expect(levelGapForWidth(0, 211)).toBe(0)
  })
})

describe('roundAtScroll', () => {
  it('стоим на раунде, пока не тронули полосу', () => {
    expect(roundAtScroll(0, 390, 3)).toBe(0)
    expect(roundAtScroll(390, 390, 3)).toBe(1)
    expect(roundAtScroll(780, 390, 3)).toBe(2)
  })

  it('сдвинулись — предыдущий раунд сразу считается пройденным', () => {
    expect(roundAtScroll(1, 390, 3)).toBe(1)
    expect(roundAtScroll(194, 390, 3)).toBe(1)
    expect(roundAtScroll(391, 390, 3)).toBe(2)
  })

  it('дальше последнего раунда не уходит', () => {
    expect(roundAtScroll(99999, 390, 3)).toBe(2)
  })

  it('ширину ещё не знаем — стоим на первом', () => {
    expect(roundAtScroll(100, 0, 3)).toBe(0)
  })
})

describe('roundOfDepth', () => {
  it('сетка растёт справа налево: первый раунд самый глубокий', () => {
    expect([2, 1, 0].map((depth) => roundOfDepth(depth, 3, true))).toEqual([0, 1, 2])
  })

  it('обычное направление: раунд совпадает с глубиной', () => {
    expect([0, 1, 2].map((depth) => roundOfDepth(depth, 3, false))).toEqual([0, 1, 2])
  })
})

describe('roundSiblingGap', () => {
  it('чем больше матчей, тем крупнее отступ', () => {
    expect(roundSiblingGap(1, 12)).toBe(12)
    expect(roundSiblingGap(2, 12)).toBe(24)
    expect(roundSiblingGap(4, 12)).toBe(48)
  })

  it('дальше четырёх матчей не растёт', () => {
    expect(roundSiblingGap(8, 12)).toBe(48)
    expect(roundSiblingGap(64, 12)).toBe(48)
  })

  it('пустой раунд получает базовый отступ', () => {
    expect(roundSiblingGap(0, 12)).toBe(12)
  })
})
