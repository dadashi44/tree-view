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
