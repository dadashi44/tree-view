import Vue, { type PropType, type VNode } from 'vue'
import {
  MOBILE_MEDIA_QUERY,
  buildBracketRounds,
  findScrollParent,
  horizontalBox,
  nodesInColumn,
  offsetWithin,
  roundScrollLeft,
  smoothScrollLeft,
  watchMedia,
  type BracketRound,
  type BracketRoundColumn,
  type BracketRoundsModel,
} from '@bigplay/tree-view-core'

/**
 * Полоса раундов для Vue 2. Разметка и классы один в один как в Vue 3 —
 * колонки считает та же функция из core, стили общие.
 */
export default Vue.extend({
  name: 'BracketRounds',
  props: {
    /** Раунды по порядку — от первого к финалу. */
    rounds: { type: Array as PropType<BracketRound[]>, default: () => [] },
    /** Ширина карточки матча — то же число, что в `nodeWidth` у сетки. */
    nodeWidth: { type: Number, default: 180 },
    /** Промежуток между раундами — то же число, что в `levelGap` у сетки. */
    levelGap: { type: Number, default: 60 },
    /** Показывать полосу. Содержимое слота рисуется в любом случае. */
    isShow: { type: Boolean, default: true },
    /** Нажатие на раунд подводит к нему сетку. Не передан — решает ширина экрана. */
    scrollOnClick: { type: Boolean, default: undefined },
    /** Медиавыражение «узкий экран», при котором нажатие включается. */
    mobileQuery: { type: String, default: MOBILE_MEDIA_QUERY },
  },

  data() {
    return {
      // Узкий ли экран. До монтирования — нет: на сервере ширину знать неоткуда.
      isNarrow: false,
      unwatch: null as null | (() => void),
    }
  },

  computed: {
    /** Полосы нет — нажимать не на что. */
    isClickable(): boolean {
      return this.isShow && (this.scrollOnClick === undefined ? this.isNarrow : this.scrollOnClick)
    },

    model(): BracketRoundsModel {
      return buildBracketRounds(this.rounds, {
        nodeWidth: this.nodeWidth,
        levelGap: this.levelGap,
      })
    },
  },

  mounted() {
    this.unwatch = watchMedia(this.mobileQuery, (matches) => {
      this.isNarrow = matches
    })
  },

  beforeDestroy() {
    this.unwatch?.()
  },

  methods: {
    /**
     * Подводит сетку к матчам раунда — только по горизонтали.
     *
     * Меряем по самой карточке: так раунд встаёт по центру экрана точно, а у финала
     * прокрутка упирается в правый край и он виден целиком. Карточек не нашли
     * (виртуализация) — считаем по колонке, она той же ширины и на том же месте.
     *
     * Вертикаль не трогаем: страница остаётся там, где была.
     */
    scrollToRound(column: BracketRoundColumn): void {
      const element = this.$el as HTMLElement | null
      const container = findScrollParent(element)
      if (!element || !container) return

      const content = this.$refs.content as HTMLElement | undefined
      // Карточки раунда стоят друг под другом, поэтому по горизонтали годится любая.
      const card = content
        ? nodesInColumn(content, column.index, column.width, this.model.offset)[0]
        : undefined

      const box = card
        ? horizontalBox(card, container)
        : {
            left: offsetWithin(element, container) + column.index * column.width,
            width: column.width,
          }

      smoothScrollLeft(
        container,
        roundScrollLeft({
          ...box,
          viewport: container.clientWidth,
          scrollWidth: container.scrollWidth,
        }),
      )
    },

    /** Нажатие — только на узком экране: на широком колонка раунда это просто подпись. */
    onSelect(column: BracketRoundColumn): void {
      if (!this.isClickable) return

      this.$emit('select', column)
      this.scrollToRound(column)
    },

    renderColumn(h: typeof Vue.prototype.$createElement, column: BracketRoundColumn): VNode {
      return h(
        'div',
        {
          key: column.key,
          class: 'tv-rounds__item',
          style: { width: `${column.width}px` },
          on: { click: () => this.onSelect(column) },
        },
        this.$scopedSlots.round?.({ round: column }) ?? column.name,
      )
    },
  },

  render(h): VNode {
    const children: VNode[] = []

    if (this.isShow) {
      children.push(
        h(
          'div',
          { class: 'tv-rounds__bar', style: { width: `${this.model.width}px` } },
          this.model.columns.map((column) => this.renderColumn(h, column)),
        ),
      )
    }

    children.push(
      h(
        'div',
        {
          ref: 'content',
          class: 'tv-rounds__content',
          // Сюда кладут саму сетку: ей достаётся отступ, центрующий матчи.
          style: this.isShow ? { paddingLeft: `${this.model.offset}px` } : {},
        },
        this.$slots.default,
      ),
    )

    return h('div', { class: 'tv-rounds' }, children)
  },
})
