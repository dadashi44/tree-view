import { describe, expect, it } from 'vitest'
import { bracketCardHeight, buildBracketCard } from '../src/bracket'

const played = {
  teams: [
    { id: 1, name: 'W1NGS', score: 2, isWinner: true },
    { id: 2, name: 'Unravel Her', score: 1 },
  ],
}

describe('buildBracketCard', () => {
  it('делает по строке на команду', () => {
    const card = buildBracketCard(played)

    expect(card.rows).toHaveLength(2)
    expect(card.rows[0]).toMatchObject({ key: '1', score: '2', isWinner: true, isLoser: false })
    expect(card.rows[1]).toMatchObject({ key: '2', score: '1', isWinner: false, isLoser: true })
  })

  it('дорисовывает пустые строки, если матч ещё не сыгран', () => {
    const card = buildBracketCard({ teams: [] })

    expect(card.rows).toHaveLength(2)
    expect(card.rows.every((row) => row.isEmpty && row.team === null)).toBe(true)
  })

  it('у финала можно попросить одну строку', () => {
    const card = buildBracketCard({ teams: [] }, { rows: 1 })

    expect(card.rows).toHaveLength(1)
  })

  it('команд больше, чем запрошено строк — не теряем ни одной', () => {
    const card = buildBracketCard(played, { rows: 1 })

    expect(card.rows).toHaveLength(2)
  })

  it('техническое поражение показывает «ТП» вместо счёта', () => {
    const card = buildBracketCard({
      teams: [{ id: 1, name: 'A', score: 0, isTechDefeat: true }],
    })

    expect(card.rows[0]!.score).toBe('ТП')
    expect(card.rows[0]!.isTechDefeat).toBe(true)
  })

  it('подпись технического поражения можно заменить', () => {
    const card = buildBracketCard(
      { teams: [{ name: 'A', isTechDefeat: true }] },
      { techDefeatLabel: 'WO' },
    )

    expect(card.rows[0]!.score).toBe('WO')
  })

  it('находит мою команду', () => {
    expect(buildBracketCard(played).hasMyTeam).toBe(false)
    expect(buildBracketCard({ teams: [{ name: 'A', isMyTeam: true }] }).hasMyTeam).toBe(true)
  })

  it('без матча отдаёт пустую карточку, а не падает', () => {
    expect(buildBracketCard(null).rows).toHaveLength(2)
    expect(buildBracketCard(undefined).hasMyTeam).toBe(false)
  })

  it('у команды без id ключ всё равно уникальный', () => {
    const card = buildBracketCard({ teams: [{ name: 'A' }, { name: 'B' }] })
    const keys = card.rows.map((row) => row.key)

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('bracketCardHeight', () => {
  it('считает высоту по числу строк', () => {
    expect(bracketCardHeight(played)).toBe(80)
    expect(bracketCardHeight({ teams: [] }, { rows: 1 })).toBe(40)
  })

  it('высоту строки можно задать свою', () => {
    expect(bracketCardHeight(played, { rowHeight: 30 })).toBe(60)
  })

  it('совпадает с числом строк карточки', () => {
    const match = { teams: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }

    expect(bracketCardHeight(match, { rows: 2 })).toBe(buildBracketCard(match, { rows: 2 }).rows.length * 40)
  })
})
