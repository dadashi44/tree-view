import type { App, Plugin } from 'vue'
import TreeView from './TreeView.vue'
import TreeNodeCard from './TreeNodeCard.vue'
import BracketCard from './BracketCard.vue'
import BracketRounds from './BracketRounds.vue'
// Стили общие для Vue 2 и Vue 3 — лежат в core, чтобы не расходились.
// Они попадают прямо в бандл и подключаются сами: отдельный импорт в проекте не нужен.
import { injectStyles } from '@bigplay/tree-view-core'
import styles from '@bigplay/tree-view-core/style.css?inline'

injectStyles(styles)

export { TreeView, TreeNodeCard, BracketCard, BracketRounds }
export { useTreeLayout } from './useTreeLayout'
export { usePanZoom } from './usePanZoom'

// Типы из core переэкспортируем, чтобы их не приходилось ставить отдельно.
export type {
  Accessors,
  BracketCardMatch,
  BracketCardModel,
  BracketCardOptions,
  BracketCardRow,
  BracketCardTeam,
  BracketRound,
  BracketRoundColumn,
  BracketRoundsModel,
  BracketRoundsOptions,
  Direction,
  Layout,
  LayoutLink,
  LayoutNode,
  LinkStyle,
  ScaleLimits,
  Transform,
  TreeNode,
  TreeViewOptions,
} from '@bigplay/tree-view-core'
export {
  DEFAULT_OPTIONS,
  MOBILE_MEDIA_QUERY,
  buildBracketCard,
  bracketCardHeight,
  buildBracketRounds,
} from '@bigplay/tree-view-core'

/** Плагин: `app.use(TreeViewPlugin)` регистрирует компоненты глобально. */
export const TreeViewPlugin: Plugin = {
  install(app: App) {
    app.component('TreeView', TreeView)
    app.component('TreeNodeCard', TreeNodeCard)
    app.component('BracketCard', BracketCard)
    app.component('BracketRounds', BracketRounds)
  },
}

export default TreeViewPlugin
