import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketRounds from '../src/BracketRounds'

const rounds = [
  { id: 1, name: '1/4' },
  { id: 2, name: '1/2' },
  { id: 3, name: 'Финал' },
]

const propsData = { rounds, nodeWidth: 211, levelGap: 39 }

describe('BracketRounds (Vue 2)', () => {
  it('рисует по колонке на раунд', () => {
    const items = mount(BracketRounds, { propsData }).findAll('.tv-rounds__item')

    expect(items).toHaveLength(3)
    expect(items.at(2).text()).toBe('Финал')
  })

  it('классы и размеры такие же, как в Vue 3', () => {
    const wrapper = mount(BracketRounds, {
      propsData,
      slots: { default: '<i>сетка</i>' },
    })

    expect(wrapper.find('.tv-rounds__item').attributes('style')).toContain('width: 250px')
    expect(wrapper.find('.tv-rounds__content').attributes('style')).toContain('padding-left: 19.5px')
  })

  it('is-show убирает полосу, но не содержимое', () => {
    const wrapper = mount(BracketRounds, {
      propsData: { ...propsData, isShow: false },
      slots: { default: '<i>сетка</i>' },
    })

    expect(wrapper.find('.tv-rounds__bar').exists()).toBe(false)
    expect(wrapper.find('i').exists()).toBe(true)
  })

  it('на широком экране раунд не кнопка: клик ничего не делает', async () => {
    const wrapper = mount(BracketRounds, { propsData })

    await wrapper.findAll('.tv-rounds__item').at(1).trigger('click')

    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('на узком экране выглядит так же: те же колонки той же ширины', () => {
    const wide = mount(BracketRounds, { propsData })
    const narrow = mount(BracketRounds, { propsData: { ...propsData, scrollOnClick: true } })

    expect(narrow.find('.tv-rounds__bar').html()).toBe(wide.find('.tv-rounds__bar').html())
  })

  it('нажатие отдаёт раунд', async () => {
    const wrapper = mount(BracketRounds, { propsData: { ...propsData, scrollOnClick: true } })

    await wrapper.findAll('.tv-rounds__item').at(1).trigger('click')

    expect(wrapper.emitted('select')![0]![0]).toMatchObject({ id: 2, name: '1/2', index: 1 })
  })

  it('нажатие подводит экран к матчам раунда — и к финалу тоже', async () => {
    const wrapper = mount(BracketRounds, {
      propsData: { ...propsData, scrollOnClick: true },
      slots: {
        default:
          '<div class="tree-view__node" data-left="19.5"></div>' +
          '<div class="tree-view__node" data-left="519.5"></div>',
      },
      attachTo: document.body.appendChild(document.createElement('div')),
    })

    const content = wrapper.find('.tv-rounds__content').element
    content.getBoundingClientRect = () => ({ left: 0 }) as DOMRect

    const cards = wrapper.findAll('.tree-view__node')
    for (let index = 0; index < cards.length; index += 1) {
      const element = cards.at(index).element
      const left = Number(element.getAttribute('data-left'))
      element.getBoundingClientRect = () => ({ left, width: 211 }) as DOMRect
      element.scrollIntoView = vi.fn()
    }

    await wrapper.findAll('.tv-rounds__item').at(2).trigger('click')

    // Финал — вторая карточка: к ней и ведём, по обеим осям.
    expect(cards.at(1).element.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    })
    expect(cards.at(0).element.scrollIntoView).not.toHaveBeenCalled()
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
      propsData: { ...propsData, scrollOnClick: true },
      attachTo: scroll.appendChild(document.createElement('div')),
    })

    await wrapper.findAll('.tv-rounds__item').at(2).trigger('click')

    // Третья колонка начинается на 500, её центр — 625, половина экрана — 250.
    expect(scroll.scrollTo).toHaveBeenCalledWith({ left: 375, behavior: 'smooth' })
  })
})
