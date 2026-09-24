import { clamp } from './viewport'

/**
 * Полоса раундов над турнирной сеткой.
 *
 * Как и у карточки матча, здесь только та часть, которая не зависит от Vue:
 * из списка раундов получаются колонки с готовой шириной. Компоненты
 * `BracketRounds` для Vue 2 и Vue 3 берут этот список и рисуют разметку.
 *
 * Зачем считать ширину, а не задавать её руками: колонка раунда шире карточки
 * ровно на промежуток между уровнями (`levelGap`), поэтому карточки стоят не по
 * центру своих раундов, а прижимаются к левому краю. Лечится половиной
 * промежутка слева от сетки — это и есть `offset`.
 */

/** Раунд глазами полосы: нужны только название и идентификатор. */
export interface BracketRound {
  id?: string | number
  name: string
}

export interface BracketRoundsOptions {
  /** Ширина карточки матча — то же число, что в `nodeWidth` у сетки. */
  nodeWidth: number
  /** Промежуток между раундами — то же число, что в `levelGap` у сетки. */
  levelGap: number
}

/** Одна колонка полосы. */
export interface BracketRoundColumn {
  /** Ключ для `v-for`. */
  key: string
  /** Идентификатор раунда; если в данных его нет — порядковый номер. */
  id: string | number
  name: string
  index: number
  /** Ширина колонки в пикселях: карточка + промежуток между раундами. */
  width: number
}

/** Что рисовать: колонки, общая ширина полосы и отступ сетки под ней. */
export interface BracketRoundsModel {
  columns: BracketRoundColumn[]
  /** Ширина всей полосы в пикселях. */
  width: number
  /** Отступ сетки слева, после которого матчи встают по центру своих раундов. */
  offset: number
}

/**
 * Превращает список раундов в список колонок.
 *
 * Ширина у всех колонок одинаковая, потому что уровни сетки расставлены
 * с одинаковым шагом: `nodeWidth + levelGap`.
 */
export function buildBracketRounds(
  rounds: BracketRound[] | null | undefined,
  options: BracketRoundsOptions,
): BracketRoundsModel {
  const width = options.nodeWidth + options.levelGap

  const columns: BracketRoundColumn[] = (rounds ?? []).map((round, index) => {
    const id = round.id ?? index

    return { key: String(id), id, name: round.name, index, width }
  })

  return { columns, width: width * columns.length, offset: options.levelGap / 2 }
}

/** Прокручиваемый блок глазами полосы: где колонка и сколько видно. */
export interface RoundScrollBox {
  /** Левый край колонки раунда внутри прокручиваемого блока. */
  left: number
  /** Ширина колонки. */
  width: number
  /** Ширина видимой части блока. */
  viewport: number
  /** Вся ширина содержимого блока. */
  scrollWidth: number
}

/**
 * Куда прокрутить блок, чтобы раунд оказался по центру видимой части.
 *
 * У крайних раундов центр недостижим — прокрутка упирается в край,
 * поэтому результат обрезается по границам блока.
 */
export function roundScrollLeft(box: RoundScrollBox): number {
  const centered = box.left + box.width / 2 - box.viewport / 2

  return clamp(centered, 0, Math.max(0, box.scrollWidth - box.viewport))
}

/**
 * Промежуток между раундами, при котором один раунд занимает всю ширину блока.
 *
 * На узком экране из сетки получается «свайпер»: колонка раунда становится
 * шириной с экран, карточка встаёт по его центру (за это отвечает `offset`),
 * а линии между матчами остаются на месте — сетка по-прежнему одна.
 */
export function levelGapForWidth(width: number, nodeWidth: number): number {
  return Math.max(0, width - nodeWidth)
}

/**
 * Раунд, к которому относится прокрутка.
 *
 * Считаем «вверх»: стоит полосе сдвинуться с раунда, как текущим становится
 * следующий. Предыдущий раунд уходит сразу, в начале движения, а не на полпути —
 * иначе он половину свайпа висит на экране поверх приезжающего.
 */
export function roundAtScroll(scrollLeft: number, columnWidth: number, count: number): number {
  if (columnWidth <= 0 || count <= 0) return 0

  // Мелкая поправка: прокрутка бывает дробной, и ровно на границе
  // без неё мы бы уже перескакивали на следующий раунд.
  const passed = Math.ceil(scrollLeft / columnWidth - 0.001)

  return clamp(passed, 0, count - 1)
}

/**
 * Номер раунда по глубине уровня.
 *
 * У турнирной сетки дерево растёт справа налево: корень — финал, поэтому
 * первый раунд оказывается самым глубоким. При обычном направлении номер
 * раунда совпадает с глубиной.
 */
export function roundOfDepth(depth: number, count: number, mirrored: boolean): number {
  return mirrored ? count - 1 - depth : depth
}

/** Дальше четырёх матчей отступ не растёт: экран не резиновый. */
export const MAX_GAP_STEPS = 4

/**
 * Отступ между матчами одного раунда в свайпере.
 *
 * Чем больше матчей, тем крупнее отступ: в первом раунде их восемь и с
 * маленьким отступом они сливаются в одну стену, а в полуфинале матча два —
 * там разводить нечего, и лишнее место только гонит вниз по экрану.
 */
export function roundSiblingGap(count: number, base: number): number {
  return base * clamp(count, 1, MAX_GAP_STEPS)
}

/**
 * На каком расстоянии от карточки сходятся линии пары в свайпере.
 *
 * Промежуток между раундами там во весь экран, и колено «ступеньки» посередине
 * уезжало бы далеко вправо: вместо скобки на пару у каждого матча получался бы
 * свой длинный хвост.
 */
export const SWIPE_ELBOW_OFFSET = 20
