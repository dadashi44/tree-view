import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketCard from '../src/BracketCard.vue'

const match = {
  teams: [
    { id: 1, name: 'W1NGS', score: 2, isWinner: true },
    { id: 2, name: 'Unravel Her', score: 1 },
  ],
}

describe('BracketCard', () => {
  it('рисует по строке на команду с именем и счётом', () => {
    const wrapper = mount(BracketCard, { props: { match } })
    const rows = wrapper.findAll('.tv-bracket__row')

    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('W1NGS')
    expect(rows[0]!.text()).toContain('2')
  })

  it('помечает победителя и проигравшего', () => {
    const rows = mount(BracketCard, { props: { match } }).findAll('.tv-bracket__row')

    expect(rows[0]!.classes()).toContain('tv-bracket__row--winner')
    expect(rows[1]!.classes()).toContain('tv-bracket__row--loser')
  })

  it('несыгранный матч показывает пустые ячейки', () => {
    const wrapper = mount(BracketCard, { props: { match: { teams: [] } } })

    expect(wrapper.findAll('.tv-bracket__row--empty')).toHaveLength(2)
    expect(wrapper.text()).toBe('')
  })

  it('у финала можно оставить одну строку', () => {
    const wrapper = mount(BracketCard, { props: { match: { teams: [] }, rows: 1 } })

    expect(wrapper.findAll('.tv-bracket__row')).toHaveLength(1)
  })

  it('моя команда: рамка и подсказка над карточкой', () => {
    const wrapper = mount(BracketCard, {
      props: { match: { teams: [{ id: 1, name: 'A', isMyTeam: true }] } },
    })

    expect(wrapper.classes()).toContain('tv-bracket--my-team')
    expect(wrapper.find('.tv-bracket__hint').text()).toBe('Нажми для перехода в матч 👇')
  })

  it('подсказку можно убрать пустой строкой', () => {
    const wrapper = mount(BracketCard, {
      props: { match: { teams: [{ id: 1, name: 'A', isMyTeam: true }] }, myTeamHint: '' },
    })

    expect(wrapper.find('.tv-bracket__hint').exists()).toBe(false)
  })

  it('техническое поражение: «ТП» и подсказка по наведению', async () => {
    const wrapper = mount(BracketCard, {
      props: { match: { teams: [{ id: 1, name: 'A', score: 0, isTechDefeat: true }] } },
    })
    const row = wrapper.find('.tv-bracket__row')

    expect(row.text()).toContain('ТП')
    expect(wrapper.find('.tv-bracket__tooltip').exists()).toBe(false)

    await row.trigger('mouseenter')
    expect(wrapper.find('.tv-bracket__tooltip').text()).toBe('Техническое поражение')

    await row.trigger('mouseleave')
    expect(wrapper.find('.tv-bracket__tooltip').exists()).toBe(false)
  })

  it('клик по команде отдаёт её наружу', async () => {
    const wrapper = mount(BracketCard, { props: { match } })
    await wrapper.findAll('.tv-bracket__row')[1]!.trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ id: 2, name: 'Unravel Her' })
  })

  it('клик по пустой ячейке ничего не отправляет', async () => {
    const wrapper = mount(BracketCard, { props: { match: { teams: [] } } })
    await wrapper.find('.tv-bracket__row').trigger('click')

    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
