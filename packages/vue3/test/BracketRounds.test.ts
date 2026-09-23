import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketRounds from '../src/BracketRounds.vue'

const rounds = [
  { id: 1, name: '1/4' },
  { id: 2, name: '1/2' },
  { id: 3, name: 'Финал' },
]

const props = { rounds, nodeWidth: 211, levelGap: 39 }

/** Карточка сетки на своём месте: happy-dom размеров сам не считает. */
function node(left: number): string {
  return `<div class="tree-view__node" data-left="${left}"></div>`
}

describe('BracketRounds', () => {
  it('рисует по колонке на раунд', () => {
    const items = mount(BracketRounds, { props }).findAll('.tv-rounds__item')

    expect(items).toHaveLength(3)
    expect(items[2]!.text()).toBe('Финал')
  })

  it('ширина колонки — шаг между уровнями сетки', () => {
    const item = mount(BracketRounds, { props }).find('.tv-rounds__item')

    expect(item.attributes('style')).toContain('width: 250px')
  })

  it('сетке в слоте достаётся отступ, центрующий матчи', () => {
    const wrapper = mount(BracketRounds, { props, slots: { default: '<i>сетка</i>' } })

    expect(wrapper.find('.tv-rounds__content').attributes('style')).toContain('padding-left: 19.5px')
    expect(wrapper.find('i').exists()).toBe(true)
  })

  it('is-show убирает полосу, но не содержимое', () => {
    const wrapper = mount(BracketRounds, {
      props: { ...props, isShow: false },
      slots: { default: '<i>сетка</i>' },
    })

    expect(wrapper.find('.tv-rounds__bar').exists()).toBe(false)
    expect(wrapper.find('i').exists()).toBe(true)
    // Полосы нет — центровать не под что.
    expect(wrapper.find('.tv-rounds__content').attributes('style')).toBeUndefined()
  })

  it('на широком экране раунд не кнопка: клик ничего не делает', async () => {
    const wrapper = mount(BracketRounds, { props })

    await wrapper.findAll('.tv-rounds__item')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('на узком экране выглядит так же: те же колонки той же ширины', () => {
    const wide = mount(BracketRounds, { props })
    const narrow = mount(BracketRounds, { props: { ...props, scrollOnClick: true } })

    expect(narrow.find('.tv-rounds__bar').html()).toBe(wide.find('.tv-rounds__bar').html())
  })

  it('нажатие отдаёт раунд', async () => {
    const wrapper = mount(BracketRounds, { props: { ...props, scrollOnClick: true } })

    await wrapper.findAll('.tv-rounds__item')[1]!.trigger('click')

    expect(wrapper.emitted('select')![0]![0]).toMatchObject({ id: 2, name: '1/2', index: 1 })
  })

  it('ведёт к финалу по самой карточке и не трогает вертикаль', async () => {
    // Блок с горизонтальной прокруткой: в happy-dom размеры задаются руками.
    const scroll = document.createElement('div')
    scroll.style.overflowX = 'auto'
    Object.defineProperty(scroll, 'scrollWidth', { value: 1000 })
    Object.defineProperty(scroll, 'clientWidth', { value: 500 })
    scroll.getBoundingClientRect = () => ({ left: 0 }) as DOMRect
    scroll.scrollTo = vi.fn()
    document.body.appendChild(scroll)

    const wrapper = mount(BracketRounds, {
      props: { ...props, scrollOnClick: true },
      slots: { default: node(19.5) + node(269.5) + node(519.5) },
      attachTo: scroll,
    })

    const content = wrapper.find('.tv-rounds__content').element
    content.getBoundingClientRect = () => ({ left: 0 }) as DOMRect

    const cards = wrapper.findAll('.tree-view__node')
    for (const card of cards) {
      const left = Number(card.attributes('data-left'))
      card.element.getBoundingClientRect = () => ({ left, width: 211 }) as DOMRect
      card.element.scrollIntoView = vi.fn()
    }

    await wrapper.findAll('.tv-rounds__item')[2]!.trigger('click')

    // Финал: 519.5 + 105.5 − 250 = 375, дальше упор в правый край.
    expect(scroll.scrollTo).toHaveBeenCalledWith({ left: 375, behavior: 'smooth' })
    // Вертикаль не трогаем: страница остаётся там, где была.
    expect(cards[2]!.element.scrollIntoView).not.toHaveBeenCalled()
  })

  it('карточек нет на экране — прокручивает по колонкам', async () => {
    // Блок с горизонтальной прокруткой: в happy-dom размеры задаются руками.
    const scroll = document.createElement('div')
    scroll.style.overflowX = 'auto'
    Object.defineProperty(scroll, 'scrollWidth', { value: 1000 })
    Object.defineProperty(scroll, 'clientWidth', { value: 500 })
    scroll.scrollTo = vi.fn()
    document.body.appendChild(scroll)

    const wrapper = mount(BracketRounds, {
      props: { ...props, scrollOnClick: true },
      attachTo: scroll,
    })

    await wrapper.findAll('.tv-rounds__item')[2]!.trigger('click')

    // Третья колонка начинается на 500, её центр — 625, половина экрана — 250.
    expect(scroll.scrollTo).toHaveBeenCalledWith({ left: 375, behavior: 'smooth' })
  })

  it('слот round заменяет подпись', () => {
    const wrapper = mount(BracketRounds, {
      props,
      slots: { round: '<b>{{ params.round.name }}</b>' },
    })

    expect(wrapper.find('.tv-rounds__item b').text()).toBe('1/4')
  })
})
