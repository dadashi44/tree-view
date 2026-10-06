/**
 * Данные в том же виде, в каком их отдаёт API турниров (clientFrontend):
 * словари раундов и команд + плоский список матчей, где `next_group_id`
 * указывает на матч следующего раунда.
 */

export interface ApiRound {
  id: number
  name: string
}

export interface ApiTeam {
  id: number
  name: string
}

export interface ApiResultFields {
  /** 1 — команда прошла дальше. */
  is_winner: number
  /** Счёт по серии. */
  winner_matches_count: number
  /** Техническое поражение. */
  is_wo?: boolean
}

export interface ApiMatch {
  id: number
  group_id: number
  round_id: number
  /** id матча следующего раунда или null у финала. */
  next_group_id: number | null
  teams: Array<{ id: number; result_fields: ApiResultFields }>
}

export interface ApiGrid {
  rounds: ApiRound[]
  matches: ApiMatch[]
}

export const teams: ApiTeam[] = [
  { id: 1, name: 'AKUZAN' },
  { id: 2, name: 'W1NGS' },
  { id: 3, name: 'TE1KO' },
  { id: 4, name: 'Cinnabon' },
  { id: 5, name: 'ASAEMON' },
  { id: 6, name: 'Slime And Girl' },
  { id: 7, name: 'weakness' },
  { id: 8, name: 'Unravel Her' },
  // Дальше — только для большой сетки (singleGrid): 32 команды, пять раундов.
  { id: 9, name: 'Nocturne' },
  { id: 10, name: 'Pale Horse' },
  { id: 11, name: 'Gravity Well' },
  { id: 12, name: 'Soft Reset' },
  { id: 13, name: 'Kaidan' },
  { id: 14, name: 'Lowlight' },
  { id: 15, name: 'Myrrh' },
  { id: 16, name: 'Vesper' },
  { id: 17, name: 'Blackout Sun' },
  { id: 18, name: 'Orchid Nine' },
  { id: 19, name: 'Cold Signal' },
  { id: 20, name: 'Hanabi' },
  { id: 21, name: 'Rust & Rue' },
  { id: 22, name: 'Quiet Riot' },
  { id: 23, name: 'Tenebris' },
  { id: 24, name: 'Half Measure' },
  { id: 25, name: 'Sable' },
  { id: 26, name: 'Northwind' },
  { id: 27, name: 'Ash Parade' },
  { id: 28, name: 'Velvet Crow' },
  { id: 29, name: 'Fathom' },
  { id: 30, name: 'Lantern' },
  { id: 31, name: 'Saltwater' },
  { id: 32, name: 'Dead Reckoning' },
]

/** id команд, которые считаются «моими» — их пара подсвечивается в сетке. */
export const myTeamIds = new Set([3])

function played(
  id: number,
  roundId: number,
  nextId: number | null,
  home: [teamId: number, score: number],
  away: [teamId: number, score: number],
  techDefeatTeamId?: number,
): ApiMatch {
  const [homeId, homeScore] = home
  const [awayId, awayScore] = away

  return {
    id,
    group_id: id,
    round_id: roundId,
    next_group_id: nextId,
    teams: [
      {
        id: homeId,
        result_fields: {
          is_winner: homeScore > awayScore ? 1 : 0,
          winner_matches_count: homeScore,
          is_wo: techDefeatTeamId === homeId,
        },
      },
      {
        id: awayId,
        result_fields: {
          is_winner: awayScore > homeScore ? 1 : 0,
          winner_matches_count: awayScore,
          is_wo: techDefeatTeamId === awayId,
        },
      },
    ],
  }
}

/** Матч, который ещё не сыгран: команд нет, в сетке рисуются пустые ячейки. */
function pending(id: number, roundId: number, nextId: number | null): ApiMatch {
  return { id, group_id: id, round_id: roundId, next_group_id: nextId, teams: [] }
}

/** Верхняя сетка: 8 команд, три раунда. */
export const upperGrid: ApiGrid = {
  rounds: [
    { id: 1, name: '1/4 финала' },
    { id: 2, name: '1/2 финала' },
    { id: 3, name: 'Финал' },
  ],
  matches: [
    played(6568, 1, 6572, [1, 2], [2, 0]),
    played(6569, 1, 6572, [3, 2], [4, 1]),
    played(6570, 1, 6573, [5, 2], [6, 0]),
    played(6571, 1, 6573, [7, 2], [8, 0], 8),
    played(6572, 2, 6574, [1, 2], [3, 1]),
    played(6573, 2, 6574, [5, 2], [7, 0]),
    played(6574, 3, null, [1, 3], [5, 2]),
  ],
}

/** Нижняя сетка: проигравшие, финал ещё не сыгран. */
export const lowerGrid: ApiGrid = {
  rounds: [
    { id: 11, name: 'Нижний раунд 1' },
    { id: 12, name: 'Нижний раунд 2' },
    { id: 13, name: 'Финал нижней сетки' },
  ],
  matches: [
    played(6580, 11, 6582, [2, 2], [4, 0]),
    played(6581, 11, 6582, [6, 0], [8, 2]),
    played(6582, 12, 6583, [2, 1], [8, 2]),
    pending(6583, 13, null),
  ],
}

/**
 * Большая сетка: 32 команды, пять раундов.
 *
 * Нужна для проверок, которым мало трёх раундов: прилипание полосы раундов
 * видно только тогда, когда сетка выше экрана, а поведение свайпа — когда
 * раундов больше, чем влезает.
 *
 * Собирается кодом, а не руками: пары идут по порядку, дальше всегда проходит
 * команда с меньшим id — какие именно, тут не важно, важен размер.
 */
function buildSingleGrid(): ApiGrid {
  const names = ['1/16 финала', '1/8 финала', '1/4 финала', '1/2 финала', 'Финал']
  const rounds: ApiRound[] = names.map((name, index) => ({ id: index + 1, name }))
  const matches: ApiMatch[] = []

  let participants = Array.from({ length: 32 }, (_, index) => index + 1)
  let matchId = 7001

  rounds.forEach((round, roundIndex) => {
    const winners: number[] = []
    const isFinal = roundIndex === rounds.length - 1
    // Матчи следующего раунда идут подряд сразу за матчами текущего.
    const nextRoundStart = matchId + participants.length / 2

    participants.forEach((home, index) => {
      if (index % 2 === 1) return

      const away = participants[index + 1]!
      const winner = Math.min(home, away)
      const next = isFinal ? null : nextRoundStart + Math.floor(index / 4)

      matches.push(
        played(
          matchId++,
          round.id,
          next,
          [home, winner === home ? 2 : 1],
          [away, winner === away ? 2 : 1],
        ),
      )
      winners.push(winner)
    })

    participants = winners
  })

  return { rounds, matches }
}

/** Single elimination в песочнице: 32 команды. */
export const singleGrid: ApiGrid = buildSingleGrid()
