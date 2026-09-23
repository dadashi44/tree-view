import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BracketRounds from '../src/BracketRounds.vue'

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
const props = { rounds, options }

/** Карточка сетки на своём месте: happy-dom размеров сам не считает. */
function node(left: number): string {
  return `<div class="tree-view__node" data-left="${left}"></div>`
}

/** Блок с горизонтальной прокруткой: размеры задаются руками. */
function scrollable(width = 390): HTMLElement {
  const element = document.createElement('div')
  element.style.overflowX = 'auto'
  Object.defineProperty(element, 'scrollWidth', { value: 1000, configurable: true })
  Object.defineProperty(element, 'clientWidth', { value: width, configurable: true })
  element.getBoundingClientRect = () => ({ left: 0 }) as DOMRect
  element.scrollTo = vi.fn()
  document.body.appendChild(element)

  return element
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

  it('на широком экране отдаёт настройки сетки как есть', () => {
    const seen: Array<Record<string, unknown>> = []
    mount(BracketRounds, {
      props,
      slots: { default: (params: { options: Record<string, unknown> }) => seen.push(params.options) },
    })

    expect(seen[0]).toEqual(options)
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

  it('клик по раунду отдаёт его наружу', async () => {
    const wrapper = mount(BracketRounds, { props })

    await wrapper.findAll('.tv-rounds__item')[1]!.trigger('click')

    expect(wrapper.emitted('select')![0]![0]).toMatchObject({ id: 2, name: '1/2', index: 1 })
  })

  describe('свайпер на узком экране', () => {
    /**
     * Ширину полосе даёт родительский блок. В happy-dom размеров нет вовсе,
     * поэтому подменяем clientWidth на время этих тестов.
     */
    const width = 390
    let restore: PropertyDescriptor | undefined

    beforeEach(() => {
      restore = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get: () => width,
      })
    })

    afterEach(() => {
      if (restore) Object.defineProperty(HTMLElement.prototype, 'clientWidth', restore)
    })

    it('раунд занимает всю ширину блока, карточка встаёт по центру', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        slots: { default: '<i>сетка</i>' },
        attachTo: document.body,
      })
      // Ширину компонент узнаёт после монтирования — ждём перерисовку.
      await nextTick()

      // 390 = 211 карточки + 179 промежутка, отступ — половина промежутка.
      expect(wrapper.find('.tv-rounds__item').attributes('style')).toContain('width: 390px')
      expect(wrapper.find('.tv-rounds__content').attributes('style')).toContain('padding-left: 89.5px')
    })

    it('полоса сама становится прокручиваемой', () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        attachTo: document.body,
      })

      expect(wrapper.classes()).toContain('tv-rounds--swipe')
    })

    it('сетке уходят растянутые раунды и сжатые матчи', async () => {
      const seen: Array<Record<string, unknown>> = []

      mount(BracketRounds, {
        props: { ...props, swipe: true, swipeSiblingGap: 8 },
        slots: {
          default: (params: { options: Record<string, unknown> }) => seen.push(params.options),
        },
        attachTo: document.body,
      })
      await nextTick()

      // Ширина карточки не меняется — иначе разъехалась бы вёрстка матчей.
      expect(seen.at(-1)).toEqual({ ...options, levelGap: 179, siblingGap: 8 })
    })

    it('пройденные раунды и их линии прячутся', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        slots: {
          // Сетка справа налево: первый раунд — самая большая глубина.
          default:
            '<div class="tree-view__node" data-depth="2"></div>' +
            '<g data-depth="2"></g>' +
            '<div class="tree-view__node" data-depth="1"></div>' +
            '<div class="tree-view__node" data-depth="0"></div>',
        },
        attachTo: document.body,
      })
      await nextTick()

      expect(wrapper.findAll('.tv-hidden')).toHaveLength(0)

      // Свайпнули на второй раунд: первый уходит вместе со своей линией.
      const root = wrapper.element as HTMLElement
      Object.defineProperty(root, 'scrollLeft', { value: 390, configurable: true })
      await wrapper.trigger('scroll')
      await nextTick()

      expect(wrapper.findAll('.tv-hidden').map((n) => n.attributes('data-depth'))).toEqual(['2', '2'])
      expect(wrapper.emitted('round')![0]).toEqual([1])
    })

    it('hide-passed отключает скрытие', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true, hidePassed: false },
        slots: { default: '<div class="tree-view__node" data-depth="2"></div>' },
        attachTo: document.body,
      })
      await nextTick()

      const root = wrapper.element as HTMLElement
      Object.defineProperty(root, 'scrollLeft', { value: 390, configurable: true })
      await wrapper.trigger('scroll')
      await nextTick()

      expect(wrapper.findAll('.tv-hidden')).toHaveLength(0)
    })

    it('полоса не показана — свайпера нет', () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true, isShow: false },
        attachTo: document.body,
      })

      expect(wrapper.classes()).not.toContain('tv-rounds--swipe')
    })
  })

  it('ведёт к финалу по самой карточке и не трогает вертикаль', async () => {
    const scroll = scrollable(500)
    const wrapper = mount(BracketRounds, {
      props,
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
    const scroll = scrollable(500)
    const wrapper = mount(BracketRounds, { props, attachTo: scroll })

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
