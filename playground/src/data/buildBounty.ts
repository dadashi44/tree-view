import { flatten, fromLevels } from '@dadashi44/tree-view-core'
import { myTeamIds } from './tournament'
import type { BountyGroup, BountyRound } from './bounty'

export interface BountyNodeTeam {
  id: number
  name: string
  score: number
  /** Лучший результат в группе — подсвечивается. */
  isBest: boolean
  isMyTeam: boolean
}

/** Узел bounty-сетки — это группа, а не матч. */
export interface BountyNode {
  id: string
  parentId: string | null
  name: string
  teams: BountyNodeTeam[]
}

/** Переводит группу из формата API в то, что рисует карточка. */
function toTeams(group: BountyGroup): BountyNodeTeam[] {
  const scoreOf = (groupTeamId: number) =>
    group.group_results.find((result) => result.group_team_id === groupTeamId)?.result_fields
      .winner_matches_count ?? 0

  const scores = group.group_teams.map((entry) => scoreOf(entry.id))
  const best = Math.max(0, ...scores)

  return group.group_teams.map((entry, index) => ({
    id: entry.team.id,
    name: entry.team.name,
    score: scores[index]!,
    isBest: best > 0 && scores[index] === best,
    isMyTeam: myTeamIds.has(entry.team.id),
  }))
}

/**
 * Собирает bounty-сетку в плоский список с проставленными связями.
 *
 * Связи в данных не заданы, поэтому их выводит `fromLevels`: группы
 * раунда попарно сходятся в группу следующего раунда. Дальше остаётся
 * отдать компоненту обычный плоский список.
 */
export function toBountyNodes(rounds: BountyRound[]): BountyNode[] {
  const levels = rounds.map((round) => round.groups)
  const roots = fromLevels(levels, { getId: (group) => group.id })

  return flatten(roots).map((node) => ({
    id: node.id,
    parentId: node.parentId,
    name: node.data.name,
    teams: toTeams(node.data),
  }))
}
