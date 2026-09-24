import Vue, { type PropType, type VNode } from 'vue'
import {
  buildBracketCard,
  type BracketCardMatch,
  type BracketCardRow,
} from '@bigplay/tree-view-core'

/**
 * Карточка матча для Vue 2. Разметка и классы один в один как в Vue 3 —
 * строки считает та же функция из core, стили общие.
 */
export default Vue.extend({
  name: 'BracketCard',
  props: {
    /** Матч: нужны только команды. */
    match: { type: Object as PropType<BracketCardMatch | null>, default: null },
    /** Сколько строк рисовать. У финала — одна. */
    rows: { type: Number, default: undefined },
    /** Подсказка над карточкой с моей командой. Пустая строка — не показывать. */
    myTeamHint: { type: String, default: 'Нажми для перехода в матч 👇' },
    /** Текст в ячейке счёта при техническом поражении. */
    techDefeatLabel: { type: String, default: 'ТП' },
    /** Подсказка по наведению на техническое поражение. */
    techDefeatHint: { type: String, default: 'Техническое поражение' },
    /** У матча есть предыдущие — рисуем кнопку, которая их сворачивает. */
    hasChildren: { type: Boolean, default: false },
    /** Предыдущие матчи сейчас свёрнуты. */
    collapsed: { type: Boolean, default: false },
    /** Подписи кнопки для screen reader. */
    collapseHint: { type: String, default: 'Свернуть предыдущие матчи' },
    expandHint: { type: String, default: 'Показать предыдущие матчи' },
  },

  data() {
    return { hoveredKey: null as string | null }
  },

  computed: {
    card(): ReturnType<typeof buildBracketCard> {
      return buildBracketCard(this.match, { rows: this.rows, techDefeatLabel: this.techDefeatLabel })
    },
  },

  methods: {
    /**
     * Кнопка стоит со стороны предыдущих матчей — туда же уходят линии.
     * data-tv-no-pan: нажатие не должно утаскивать холст.
     */
    renderToggle(h: typeof Vue.prototype.$createElement): VNode {
      const hint = this.collapsed ? this.expandHint : this.collapseHint

      return h(
        'button',
        {
          class: ['tv-bracket__toggle', { 'tv-bracket__toggle--collapsed': this.collapsed }],
          attrs: {
            type: 'button',
            title: hint,
            'aria-label': hint,
            'aria-expanded': String(!this.collapsed),
            'data-tv-no-pan': '',
          },
          on: {
            click: (event: MouseEvent) => {
              event.stopPropagation()
              this.$emit('toggle')
            },
          },
        },
        this.collapsed ? '+' : '−',
      )
    },

    renderRow(h: typeof Vue.prototype.$createElement, row: BracketCardRow): VNode {
      const content: VNode[] = []

      if (row.team) {
        if (row.isTechDefeat && this.hoveredKey === row.key) {
          content.push(h('span', { class: 'tv-bracket__tooltip' }, this.techDefeatHint))
        }
        content.push(h('span', { class: 'tv-bracket__name' }, row.team.name))
        content.push(h('span', { class: 'tv-bracket__score' }, row.score))
      }

      return h(
        'div',
        {
          key: row.key,
          class: [
            'tv-bracket__row',
            {
              'tv-bracket__row--winner': row.isWinner,
              'tv-bracket__row--loser': row.isLoser && !row.isEmpty,
              'tv-bracket__row--my': row.isMyTeam,
              'tv-bracket__row--empty': row.isEmpty,
            },
          ],
          attrs: row.isMyTeam ? { title: 'Моя команда' } : {},
          on: {
            click: () => {
              if (row.team) this.$emit('select', row.team, row)
            },
            mouseenter: () => {
              this.hoveredKey = row.key
            },
            mouseleave: () => {
              this.hoveredKey = null
            },
          },
        },
        content,
      )
    },
  },

  render(h): VNode {
    const card = this.card
    const children: VNode[] = []

    if (card.hasMyTeam && this.myTeamHint) {
      children.push(h('div', { class: 'tv-bracket__hint' }, this.myTeamHint))
    }

    if (this.hasChildren) children.push(this.renderToggle(h))

    // Строки лежат в своей обёртке: она держит скругление и контур, поэтому
    // матч читается как один блок, а не как список из четырёх команд.
    // Подсказка и кнопка остаются снаружи — их обрезать нельзя.
    children.push(
      h(
        'div',
        { class: 'tv-bracket__rows' },
        card.rows.map((row) => this.renderRow(h, row)),
      ),
    )

    return h('div', { class: ['tv-bracket', { 'tv-bracket--my-team': card.hasMyTeam }] }, children)
  },
})
