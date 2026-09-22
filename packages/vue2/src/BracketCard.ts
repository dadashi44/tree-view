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

    for (const row of card.rows) children.push(this.renderRow(h, row))

    return h('div', { class: ['tv-bracket', { 'tv-bracket--my-team': card.hasMyTeam }] }, children)
  },
})
