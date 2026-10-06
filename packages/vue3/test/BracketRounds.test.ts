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

/**
 * Свайп: прокручивается внутренний блок с сеткой, а не сам компонент —
 * полоса раундов лежит отдельным прилипающим слоем.
 */
async function swipeTo(wrapper: ReturnType<typeof mount>, scrollLeft: number): Promise<void> {
  const scroller = wrapper.find('.tv-rounds__scroll')
  Object.defineProperty(scroller.element, 'scrollLeft', { value: scrollLeft, configurable: true })
  await scroller.trigger('scroll')
  await nextTick()
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

    it('листается блок с сеткой, а полоса — отдельный прилипающий слой', () => {
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

      const got = seen.at(-1)!

      // siblingGap теперь функция, поэтому сверяем остальное по отдельности.
      const { siblingGap: _base, ...rest } = options

      // Ширина карточки не меняется — иначе разъехалась бы вёрстка матчей.
      expect(got).toMatchObject({ ...rest, levelGap: 179, levelLayout: 'stack' })
      // Внутри пары тесно, между парами — по числу матчей в раунде.
      expect(got.siblingGap).toBe(8)
      expect((got.groupGap as (n: unknown, c: number) => number)(null, 4)).toBe(32)
      expect((got.groupGap as (n: unknown, c: number) => number)(null, 2)).toBe(16)
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
      await swipeTo(wrapper, 390)

      expect(wrapper.findAll('.tv-hidden').map((n) => n.attributes('data-depth'))).toEqual(['2', '2'])
      expect(wrapper.emitted('round')![0]).toEqual([1])
    })

    it('раунд уходит сразу, как только полосу тронули', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        slots: {
          default:
            '<div class="tree-view__node" data-depth="2"></div>' +
            '<div class="tree-view__node" data-depth="1"></div>',
        },
        attachTo: document.body,
      })
      await nextTick()

      // Сдвинулись всего на 20 из 390 — первый раунд уже считается пройденным.
      await swipeTo(wrapper, 20)

      expect(wrapper.findAll('.tv-hidden').map((n) => n.attributes('data-depth'))).toEqual(['2'])
      expect(wrapper.emitted('round')![0]).toEqual([1])
    })

    it('hide-passed отключает скрытие', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true, hidePassed: false },
        slots: { default: '<div class="tree-view__node" data-depth="2"></div>' },
        attachTo: document.body,
      })
      await nextTick()

      await swipeTo(wrapper, 390)

      expect(wrapper.findAll('.tv-hidden')).toHaveLength(0)
    })

    it('полоса лежит вне прокручиваемого блока — иначе её не прилепить', () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        attachTo: document.body,
      })

      // Полоса и блок с сеткой — соседи, а не вложены друг в друга:
      // sticky внутри элемента с overflow-x липнет к нему же, а не к экрану.
      expect(wrapper.find('.tv-rounds__scroll .tv-rounds__head').exists()).toBe(false)
      expect(wrapper.find('.tv-rounds__head .tv-rounds__bar').exists()).toBe(true)
    })

    it('якоря прилипания переехали в блок с сеткой — по одному на раунд', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        attachTo: document.body,
      })
      await nextTick()

      const anchors = wrapper.findAll('.tv-rounds__scroll .tv-rounds__snap-item')

      expect(anchors).toHaveLength(rounds.length)
      expect(anchors[0]!.attributes('style')).toContain('width: 390px')
    })

    it('свайп тянет полосу за сеткой', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        attachTo: document.body,
      })
      await nextTick()
      await swipeTo(wrapper, 390)

      expect((wrapper.find('.tv-rounds__head').element as HTMLElement).scrollLeft).toBe(390)
    })

    it('инерция не уносит дальше соседнего раунда', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        attachTo: document.body,
      })
      await nextTick()

      const scroller = wrapper.find('.tv-rounds__scroll').element as HTMLElement
      let scrollLeft = 0
      Object.defineProperty(scroller, 'scrollLeft', {
        get: () => scrollLeft,
        set: (value: number) => {
          scrollLeft = value
        },
        configurable: true,
      })

      // Инерция идёт подряд, по раунду за событие: именно так ограничитель
      // «не больше одного раунда за событие» и пропускал свайп через всю сетку.
      for (const left of [390, 780, 1170]) {
        scrollLeft = left
        scroller.dispatchEvent(new Event('scroll'))
        await nextTick()
      }

      // Остановились на втором раунде, а не уехали в финал.
      expect(wrapper.emitted('round')!.at(-1)).toEqual([1])
      expect(scrollLeft).toBe(390)
    })

    it('резкий свайп не перепрыгивает через раунды', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        attachTo: document.body,
      })
      await nextTick()

      const scroller = wrapper.find('.tv-rounds__scroll').element as HTMLElement
      let scrollLeft = 0
      Object.defineProperty(scroller, 'scrollLeft', {
        get: () => scrollLeft,
        set: (value: number) => {
          scrollLeft = value
        },
        configurable: true,
      })

      // Рывок из первого раунда сразу в финал: 2 × 390. Инерция успевает
      // утащить ленту за кадр, scroll-snap-stop при этом не спасает.
      scrollLeft = 780
      await scroller.dispatchEvent(new Event('scroll'))
      await nextTick()

      // Остановились на соседнем раунде и подвинули ленту к его границе.
      expect(wrapper.emitted('round')!.at(-1)).toEqual([1])
      expect(scrollLeft).toBe(390)
    })

    it('клик по раунду едет сразу, ограничитель ему не мешает', async () => {
      const wrapper = mount(BracketRounds, {
        props: { ...props, swipe: true },
        attachTo: document.body,
      })
      await nextTick()

      const scroller = wrapper.find('.tv-rounds__scroll').element as HTMLElement
      scroller.scrollTo = vi.fn()
      Object.defineProperty(scroller, 'clientWidth', { value: 390, configurable: true })
      Object.defineProperty(scroller, 'scrollWidth', { value: 1170, configurable: true })

      await wrapper.findAll('.tv-rounds__item')[2]!.trigger('click')

      expect(scroller.scrollTo).toHaveBeenCalled()
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
