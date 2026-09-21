/** Небольшая турнирная сетка: финал → 2 полуфинала → 4 четвертьфинала. */
export interface Match {
  id: string
  title: string
  children?: Match[]
}

export const bracket: Match = {
  id: 'final',
  title: 'Финал',
  children: [
    {
      id: 'sf-1',
      title: 'Полуфинал 1',
      children: [
        { id: 'qf-1', title: 'Четвертьфинал 1' },
        { id: 'qf-2', title: 'Четвертьфинал 2' },
      ],
    },
    {
      id: 'sf-2',
      title: 'Полуфинал 2',
      children: [
        { id: 'qf-3', title: 'Четвертьфинал 3' },
        { id: 'qf-4', title: 'Четвертьфинал 4' },
      ],
    },
  ],
}

/** Та же сетка, но плоским списком — второй поддерживаемый формат. */
export const flatBracket = [
  { matchId: 'final', parent: null, title: 'Финал' },
  { matchId: 'sf-1', parent: 'final', title: 'Полуфинал 1' },
  { matchId: 'sf-2', parent: 'final', title: 'Полуфинал 2' },
  { matchId: 'qf-1', parent: 'sf-1', title: 'Четвертьфинал 1' },
  { matchId: 'qf-2', parent: 'sf-1', title: 'Четвертьфинал 2' },
]
