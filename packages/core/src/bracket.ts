/**
 * Карточка матча турнирной сетки.
 *
 * Здесь — только та часть, которая не зависит от Vue: из матча получается
 * список строк, которые нужно нарисовать. Компоненты `BracketCard` для Vue 2
 * и Vue 3 берут этот список и превращают его в разметку, поэтому выглядят
 * и ведут себя одинаково.
 */

/** Команда в карточке матча. Все поля, кроме имени, необязательны. */
export interface BracketCardTeam {
  id?: string | number
  name: string
  /** Счёт: число выигранных карт, очки — что угодно. */
  score?: number | string
  isWinner?: boolean
  /** Техническое поражение: вместо счёта показывается «ТП». */
  isTechDefeat?: boolean
  /** Команда пользователя — подсвечивается отдельно. */
  isMyTeam?: boolean
}

/** Матч глазами карточки: только команды, ничего больше ей не нужно. */
export interface BracketCardMatch {
  teams: BracketCardTeam[]
}

/** Одна строка карточки. `team === null` — пустое место под несыгранный матч. */
export interface BracketCardRow {
  /** Ключ для `v-for`. */
  key: string
  team: BracketCardTeam | null
  /** Готовый текст ячейки счёта. */
  score: string
  isWinner: boolean
  isLoser: boolean
  isMyTeam: boolean
  isTechDefeat: boolean
  isEmpty: boolean
}

export interface BracketCardOptions {
  /**
   * Сколько строк в карточке. По умолчанию две — обычный матч.
   * У финала команда-победитель одна, поэтому там передают `rows: 1`.
   */
  rows?: number
  /** Что писать в ячейке счёта при техническом поражении. */
  techDefeatLabel?: string
}

/** Что рисовать: строки и признак «в матче есть моя команда». */
export interface BracketCardModel {
  rows: BracketCardRow[]
  hasMyTeam: boolean
}

/** Обычный матч — две команды. */
export const DEFAULT_BRACKET_ROWS = 2

/** Высота одной строки карточки в пикселях. */
export const DEFAULT_BRACKET_ROW_HEIGHT = 40

/**
 * Превращает матч в список строк карточки.
 *
 * Команд может быть меньше, чем строк (матч ещё не сыгран) — недостающие
 * добавляются пустыми, чтобы карточка не «худела» и сетка не разъезжалась.
 */
export function buildBracketCard(
  match: BracketCardMatch | null | undefined,
  options: BracketCardOptions = {},
): BracketCardModel {
  const teams = match?.teams ?? []
  const rowCount = Math.max(options.rows ?? DEFAULT_BRACKET_ROWS, teams.length)
  const techDefeatLabel = options.techDefeatLabel ?? 'ТП'

  const rows: BracketCardRow[] = teams.map((team, index) => {
    const isTechDefeat = team.isTechDefeat === true
    const isWinner = team.isWinner === true

    return {
      key: String(team.id ?? `team-${index}`),
      team,
      score: isTechDefeat ? techDefeatLabel : String(team.score ?? ''),
      isWinner,
      isLoser: !isWinner,
      isMyTeam: team.isMyTeam === true,
      isTechDefeat,
      isEmpty: false,
    }
  })

  for (let index = teams.length; index < rowCount; index += 1) {
    rows.push({
      key: `empty-${index}`,
      team: null,
      score: '',
      isWinner: false,
      isLoser: false,
      isMyTeam: false,
      isTechDefeat: false,
      isEmpty: true,
    })
  }

  return { rows, hasMyTeam: teams.some((team) => team.isMyTeam === true) }
}

/**
 * Высота карточки: строк × высота строки.
 *
 * Пригодится для `nodeHeight`, если у разных матчей разное число строк:
 *
 * ```ts
 * nodeHeight: (node) => bracketCardHeight(node.data, { rows: isFinal(node.data) ? 1 : 2 })
 * ```
 */
export function bracketCardHeight(
  match: BracketCardMatch | null | undefined,
  options: BracketCardOptions & { rowHeight?: number } = {},
): number {
  const teams = match?.teams ?? []
  const rowCount = Math.max(options.rows ?? DEFAULT_BRACKET_ROWS, teams.length)

  return rowCount * (options.rowHeight ?? DEFAULT_BRACKET_ROW_HEIGHT)
}
