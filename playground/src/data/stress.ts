import type { BracketMatch } from './buildBracket'

/**
 * Большая сетка для проверки скорости: «а что будет, если матчей тысяча».
 * Считается на лету, чтобы не хранить в репозитории мегабайт фикстур.
 */

const names = [
  'AKUZAN',
  'W1NGS',
  'TE1KO',
  'Cinnabon',
  'ASAEMON',
  'Slime And Girl',
  'weakness',
  'Unravel Her',
]

/**
 * Полная сетка на выбывание: `rounds` раундов, `2^rounds - 1` матчей.
 * Финал — корень, дальше вниз по два матча на каждый.
 */
export function stressBracket(rounds: number): BracketMatch[] {
  const matches: BracketMatch[] = []
  let nextId = 1

  /** Создаёт матч и, если раунд не последний, двух его «детей». */
  function build(parentId: number | null, round: number): BracketMatch {
    const id = nextId++
    const match: BracketMatch = {
      id,
      nextId: parentId,
      name: `Матч ${id}`,
      roundId: round,
      teams: [0, 1].map((slot) => {
        const index = (id * 2 + slot) % names.length
        return {
          id: id * 2 + slot,
          name: `${names[index]} ${id}`,
          score: slot === 0 ? 2 : 1,
          isWinner: slot === 0,
          isTechDefeat: false,
          // Пусть «моя команда» встречается, но редко — как в жизни.
          isMyTeam: id % 97 === 0 && slot === 0,
        }
      }),
    }

    matches.push(match)
    if (round > 1) {
      build(id, round - 1)
      build(id, round - 1)
    }
    return match
  }

  build(null, rounds)
  return matches
}
