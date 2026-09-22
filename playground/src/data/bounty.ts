/**
 * Bounty-сетка в формате API: раунды → группы → команды.
 * Ссылок на «следующую группу» здесь нет: пары групп раунда сходятся
 * в одну группу следующего раунда просто по порядку.
 */

export interface BountyGroupTeam {
  /** id записи «команда в группе» — именно на него ссылается результат. */
  id: number
  team: { id: number; name: string }
}

export interface BountyGroupResult {
  group_team_id: number
  result_fields: { winner_matches_count: number }
}

export interface BountyGroup {
  id: number
  name: string
  group_teams: BountyGroupTeam[]
  group_results: BountyGroupResult[]
}

export interface BountyRound {
  id: number
  name: string
  groups: BountyGroup[]
}

let groupTeamId = 0

/** Собирает группу: список команд и их очки. */
function group(id: number, name: string, entries: Array<[teamId: number, teamName: string, score: number]>): BountyGroup {
  const group_teams: BountyGroupTeam[] = []
  const group_results: BountyGroupResult[] = []

  for (const [teamId, teamName, score] of entries) {
    groupTeamId += 1
    group_teams.push({ id: groupTeamId, team: { id: teamId, name: teamName } })
    group_results.push({ group_team_id: groupTeamId, result_fields: { winner_matches_count: score } })
  }

  return { id, name, group_teams, group_results }
}

export const bountyGrid: BountyRound[] = [
  {
    id: 1,
    name: 'Раунд 1',
    groups: [
      group(101, 'A', [[1, 'AKUZAN', 12], [2, 'W1NGS', 7]]),
      group(102, 'B', [[3, 'TE1KO', 9], [4, 'Cinnabon', 15]]),
      group(103, 'C', [[5, 'ASAEMON', 18], [6, 'Slime And Girl', 4]]),
      group(104, 'D', [[7, 'weakness', 6], [8, 'Unravel Her', 11]]),
    ],
  },
  {
    id: 2,
    name: 'Раунд 2',
    groups: [
      group(201, 'E', [[1, 'AKUZAN', 21], [4, 'Cinnabon', 16]]),
      group(202, 'F', [[5, 'ASAEMON', 14], [8, 'Unravel Her', 19]]),
    ],
  },
  {
    id: 3,
    name: 'Финал',
    // Финал ещё не сыгран: команды известны, очков пока нет.
    groups: [group(301, 'G', [[1, 'AKUZAN', 0], [8, 'Unravel Her', 0]])],
  },
]
