import Vue, { type PropType, type VNode } from 'vue'
import {
  DEFAULT_OPTIONS,
  MOBILE_MEDIA_QUERY,
  buildBracketRounds,
  findScrollParent,
  hideRoundsBefore,
  horizontalBox,
  levelGapForWidth,
  nodesInColumn,
  offsetWithin,
  resolveOptions,
  roundAtScroll,
  roundOfDepth,
  roundScrollLeft,
  roundSiblingGap,
  smoothScrollLeft,
  watchChildren,
  watchMedia,
  watchWidth,
  type BracketRound,
  type BracketRoundColumn,
  type BracketRoundsModel,
  type TreeNode,
  type TreeViewOptions,
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
    /** Настройки сетки — те же, что уходят в `TreeView`. */
    options: { type: Object as PropType<Partial<TreeViewOptions>>, default: undefined },
    /** Показывать полосу. Содержимое слота рисуется в любом случае. */
    isShow: { type: Boolean, default: true },
    /**
     * Базовое расстояние между матчами одного раунда в свайпере.
     * Раунд с несколькими матчами получает кратно больше — до четырёх раз.
     */
    swipeSiblingGap: { type: Number, default: 12 },
    /** Прятать пройденные раунды и линии, которые из них выходят. */
    hidePassed: { type: Boolean, default: true },
    /** Включить свайпер принудительно. Не передан — решает ширина экрана. */
    swipe: { type: Boolean, default: undefined },
    /** Медиавыражение «узкий экран», при котором включается свайпер. */
    mobileQuery: { type: String, default: MOBILE_MEDIA_QUERY },
  },

  data() {
    return {
      // Узкий ли экран. До монтирования — нет: на сервере ширину знать неоткуда.
      isNarrow: false,
      // Сколько места отведено полосе: по нему считается ширина раунда в свайпере.
      available: 0,
      // Раунд, на котором стоит прокрутка. Меняется прямо во время свайпа.
      current: 0,
      stop: [] as Array<() => void>,
    }
  },

  computed: {
    /** Полосы нет — свайпать нечего: сетку в это время таскают и масштабируют. */
    isSwipe(): boolean {
      return this.isShow && (this.swipe === undefined ? this.isNarrow : this.swipe)
    },

    base(): TreeViewOptions {
      return resolveOptions(this.options)
    },

    /**
     * Карточки матчей одной ширины, поэтому у сетки с раундами `nodeWidth` —
     * число. Если это всё-таки функция, считать колонки не по чему: берём значение
     * по умолчанию, чтобы полоса не развалилась.
     */
    nodeWidth(): number {
      return typeof this.base.nodeWidth === 'number'
        ? this.base.nodeWidth
        : (DEFAULT_OPTIONS.nodeWidth as number)
    },

    levelGap(): number {
      return this.isSwipe
        ? levelGapForWidth(this.available, this.nodeWidth)
        : this.base.levelGap
    },

    model(): BracketRoundsModel {
      return buildBracketRounds(this.rounds, {
        nodeWidth: this.nodeWidth,
        levelGap: this.levelGap,
      })
    },

    /** Дерево турнирной сетки растёт справа налево: первый раунд — самый глубокий. */
    mirrored(): boolean {
      return this.base.direction === 'right-to-left' || this.base.direction === 'bottom-to-top'
    },

    /**
     * Настройки для сетки в свайпере.
     *
     * Раунды растягиваются на ширину экрана, а уровни укладываются каждый сам по
     * себе: в дереве место второго раунда выводится из первого, поэтому отдельно
     * его отступ не задать. Сам отступ зависит от того, сколько матчей в раунде.
     */
    gridOptions(): Partial<TreeViewOptions> {
      if (!this.isSwipe) return { ...this.options }

      const base = this.swipeSiblingGap

      return {
        ...this.options,
        levelGap: this.levelGap,
        levelLayout: 'stack',
        siblingGap: (_node: TreeNode<unknown>, count: number) => roundSiblingGap(count, base),
      }
    },
  },

  watch: {
    current: 'applyHidden',
    isSwipe: 'applyHidden',
    model: 'applyHidden',
  },

  mounted() {
    this.stop.push(
      watchMedia(this.mobileQuery, (matches) => {
        this.isNarrow = matches
      }),
      watchWidth((this.$el as HTMLElement).parentElement, (width) => {
        this.available = width
      }),
      // Сетка перерисовывает карточки — скрытое расставляем заново.
      watchChildren(this.$refs.content as HTMLElement, () => this.applyHidden()),
    )

    this.applyHidden()
  },

  beforeDestroy() {
    this.stop.forEach((off) => off())
  },

  methods: {
    /** Прячет всё, что осталось позади: карточки пройденных раундов и их линии. */
    applyHidden(): void {
      const content = this.$refs.content as HTMLElement | undefined
      if (!content) return

      const hideBefore = this.isSwipe && this.hidePassed ? this.current : 0
      const count = this.model.columns.length

      hideRoundsBefore(content, hideBefore, (depth) =>
        roundOfDepth(depth, count, this.mirrored),
      )
    },

    onScroll(): void {
      const element = this.$el as HTMLElement | null
      if (!element || !this.isSwipe) return

      const width = this.model.columns[0]?.width ?? 0
      const next = roundAtScroll(element.scrollLeft, width, this.model.columns.length)
      if (next === this.current) return

      this.current = next
      this.$emit('round', next)
    },

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
      if (!element) return

      // В свайпере прокручивается сама полоса, иначе — блок с overflow-x вокруг неё.
      const container = this.isSwipe ? element : findScrollParent(element)
      if (!container) return

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

    onSelect(column: BracketRoundColumn): void {
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

    // Сюда кладут саму сетку. `options` — настройки, подогнанные под экран:
    // в свайпере раунд занимает всю ширину, а матчи внутри стоят ближе.
    const content =
      this.$scopedSlots.default?.({
        options: this.gridOptions,
        isSwipe: this.isSwipe,
        round: this.current,
      }) ?? this.$slots.default

    children.push(
      h(
        'div',
        {
          ref: 'content',
          class: 'tv-rounds__content',
          style: this.isShow ? { paddingLeft: `${this.model.offset}px` } : {},
        },
        content,
      ),
    )

    return h(
      'div',
      {
        class: ['tv-rounds', { 'tv-rounds--swipe': this.isSwipe }],
        on: { scroll: () => this.onScroll() },
      },
      children,
    )
  },
})
