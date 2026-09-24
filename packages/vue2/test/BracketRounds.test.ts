import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketRounds from '../src/BracketRounds'

const rounds = [
  { id: 1, name: '1/4' },
  { id: 2, name: '1/2' },
  { id: 3, name: 'Финал' },
]

/** Те же настройки, что у сетки в песочнице. */
const options = {
  nodeWidth: 211,
  levelGap: 39,
  siblingGap: 32,
  // Сетка растёт справа налево: финал справа, первый раунд — самый глубокий.
  direction: 'right-to-left' as const,
}
const propsData = { rounds, options }

/** Отдельный блок под компонент: к нему же цепляется измерение ширины. */
const host = () => document.body.appendChild(document.createElement('div'))

describe('BracketRounds (Vue 2)', () => {
  it('рисует по колонке на раунд', () => {
    const items = mount(BracketRounds, { propsData }).findAll('.tv-rounds__item')

    expect(items).toHaveLength(3)
    expect(items.at(2).text()).toBe('Финал')
  })

  it('классы и размеры такие же, как в Vue 3', () => {
    const wrapper = mount(BracketRounds, { propsData, slots: { default: '<i>сетка</i>' } })

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

  it('клик по раунду отдаёт его наружу', async () => {
    const wrapper = mount(BracketRounds, { propsData })

    await wrapper.findAll('.tv-rounds__item').at(1).trigger('click')

    expect(wrapper.emitted('select')![0]![0]).toMatchObject({ id: 2, name: '1/2', index: 1 })
  })

  describe('свайпер на узком экране', () => {
    /**
     * Ширину полосе даёт родительский блок. В happy-dom размеров нет вовсе,
     * поэтому подменяем clientWidth на время этих тестов.
     */
    let restore: PropertyDescriptor | undefined

    beforeEach(() => {
      restore = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get: () => 390,
      })
    })

    afterEach(() => {
      if (restore) Object.defineProperty(HTMLElement.prototype, 'clientWidth', restore)
    })

    it('раунд занимает всю ширину блока, карточка встаёт по центру', async () => {
      const wrapper = mount(BracketRounds, {
        propsData: { ...propsData, swipe: true },
        attachTo: host(),
      })
      // Ширину компонент узнаёт после монтирования — ждём перерисовку.
      await wrapper.vm.$nextTick()

      // 390 = 211 карточки + 179 промежутка, отступ — половина промежутка.
      expect(wrapper.classes()).toContain('tv-rounds--swipe')
      expect(wrapper.find('.tv-rounds__item').attributes('style')).toContain('width: 390px')
      expect(wrapper.find('.tv-rounds__content').attributes('style')).toContain(
        'padding-left: 89.5px',
      )
    })

    it('сетке уходят растянутые раунды и сжатые матчи', async () => {
      const seen: Array<Record<string, unknown>> = []

      const wrapper = mount(BracketRounds, {
        propsData: { ...propsData, swipe: true, swipeSiblingGap: 8 },
        scopedSlots: {
          default(params: { options: Record<string, unknown> }) {
            seen.push(params.options)
            return undefined
          },
        },
        attachTo: host(),
      })
      await wrapper.vm.$nextTick()

      const got = seen[seen.length - 1]!

      // siblingGap теперь функция, поэтому сверяем остальное по отдельности.
      const { siblingGap: _base, ...rest } = options

      // Ширина карточки не меняется — иначе разъехалась бы вёрстка матчей.
      expect(got).toMatchObject({ ...rest, levelGap: 179, levelLayout: 'stack' })
      // Внутри пары тесно, между парами — по числу матчей в раунде.
      expect(got.siblingGap).toBe(8)
      expect((got.groupGap as (n: unknown, c: number) => number)(null, 4)).toBe(32)
      expect((got.groupGap as (n: unknown, c: number) => number)(null, 2)).toBe(16)
    })

    it('полоса не показана — свайпера нет', async () => {
      const wrapper = mount(BracketRounds, {
        propsData: { ...propsData, swipe: true, isShow: false },
        attachTo: host(),
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.classes()).not.toContain('tv-rounds--swipe')
    })
  })

  it('ведёт к финалу по самой карточке и не трогает вертикаль', async () => {
    const scroll = document.createElement('div')
    scroll.style.overflowX = 'auto'
    Object.defineProperty(scroll, 'scrollWidth', { value: 1000 })
    Object.defineProperty(scroll, 'clientWidth', { value: 500 })
    scroll.getBoundingClientRect = () => ({ left: 0 }) as DOMRect
    scroll.scrollTo = vi.fn()
    document.body.appendChild(scroll)

    const wrapper = mount(BracketRounds, {
      propsData,
      slots: {
        default:
          '<div class="tree-view__node" data-left="19.5"></div>' +
          '<div class="tree-view__node" data-left="519.5"></div>',
      },
      attachTo: scroll.appendChild(document.createElement('div')),
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

    // Финал: 519.5 + 105.5 − 250 = 375, дальше упор в правый край.
    expect(scroll.scrollTo).toHaveBeenCalledWith({ left: 375, behavior: 'smooth' })
    // Вертикаль не трогаем: страница остаётся там, где была.
    expect(cards.at(1).element.scrollIntoView).not.toHaveBeenCalled()
  })

  it('карточек нет на экране — прокручивает по колонкам', async () => {
    const scroll = document.createElement('div')
    scroll.style.overflowX = 'auto'
    Object.defineProperty(scroll, 'scrollWidth', { value: 1000 })
    Object.defineProperty(scroll, 'clientWidth', { value: 500 })
    scroll.scrollTo = vi.fn()
    document.body.appendChild(scroll)

    const wrapper = mount(BracketRounds, {
      propsData,
      attachTo: scroll.appendChild(document.createElement('div')),
    })

    await wrapper.findAll('.tv-rounds__item').at(2).trigger('click')

    // Третья колонка начинается на 500, её центр — 625, половина экрана — 250.
    expect(scroll.scrollTo).toHaveBeenCalledWith({ left: 375, behavior: 'smooth' })
  })
})
