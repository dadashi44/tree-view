import type { ApiGrid, ApiMatch, ApiTeam } from './tournament'
import { myTeamIds, teams } from './tournament'

/** Команда в том виде, в каком её рисует карточка матча. */
export interface BracketTeam {
  id: number
  name: string
  score: number
  isWinner: boolean
  isTechDefeat: boolean
  isMyTeam: boolean
}

/** Узел сетки: матч. */
export interface BracketMatch {
  id: number
  /** id матча следующего раунда — нужен «плоскому» формату. */
  nextId: number | null
  name: string
  roundId: number
  teams: BracketTeam[]
  children?: BracketMatch[]
}

const teamNames = new Map<number, string>(teams.map((team: ApiTeam) => [team.id, team.name]))

/** Переводит один матч из формата API в формат карточки. */
function toMatch(match: ApiMatch): BracketMatch {
  const hasTechDefeat = match.teams.some((team) => team.result_fields.is_wo === true)

  return {
    id: match.id,
    nextId: match.next_group_id,
    name: `Матч ${match.id}`,
    roundId: match.round_id,
    teams: match.teams.map((team) => ({
      id: team.id,
      name: teamNames.get(team.id) ?? `Команда ${team.id}`,
      score: hasTechDefeat ? 0 : team.result_fields.winner_matches_count,
      isWinner: team.result_fields.is_winner === 1,
      isTechDefeat: team.result_fields.is_wo === true,
      isMyTeam: myTeamIds.has(team.id),
    })),
  }
}

/**
 * Формат 1 — плоский список.
 * Дерево собирать не нужно: компонент сам свяжет матчи по `nextId`.
 */
export function toFlatMatches(grid: ApiGrid): BracketMatch[] {
  return grid.matches.map(toMatch)
}

/**
 * Формат 2 — вложенное дерево (так сетка собирается в clientFrontend сейчас).
 * Результат тот же, просто связи уже разложены по `children`.
 */
export function toTreeMatches(grid: ApiGrid): BracketMatch[] {
  const matches = toFlatMatches(grid)
  const childrenByParent = new Map<number, BracketMatch[]>()

  for (const match of matches) {
    if (match.nextId == null) continue
    const siblings = childrenByParent.get(match.nextId) ?? []
    siblings.push(match)
    childrenByParent.set(match.nextId, siblings)
  }

  function attachChildren(match: BracketMatch): BracketMatch {
    return { ...match, children: (childrenByParent.get(match.id) ?? []).map(attachChildren) }
  }

  const knownIds = new Set(matches.map((match) => match.id))

  return matches
    .filter((match) => match.nextId == null || !knownIds.has(match.nextId))
    .map(attachChildren)
}
