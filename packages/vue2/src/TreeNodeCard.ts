import Vue from 'vue'

/**
 * Карточка узла по умолчанию для Vue 2.
 * Разметка и классы один в один как в Vue 3 — стили общие.
 */
export default Vue.extend({
  name: 'TreeNodeCard',
  props: {
    label: { type: String, required: true },
    hasChildren: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
  },
  render(h) {
    const children = [h('span', { class: 'tree-view-card__label' }, this.label)]

    if (this.hasChildren) {
      children.push(
        h(
          'button',
          {
            class: 'tree-view-card__toggle',
            attrs: {
              type: 'button',
              'data-tv-no-pan': '',
              'aria-label': this.collapsed ? 'Развернуть' : 'Свернуть',
            },
            on: {
              click: (event: MouseEvent) => {
                event.stopPropagation()
                this.$emit('toggle')
              },
            },
          },
          this.collapsed ? '+' : '−',
        ),
      )
    }

    return h('div', { class: 'tree-view-card' }, children)
  },
})
