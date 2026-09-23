import type { VueConstructor } from 'vue'
import TreeView from './TreeView'
import TreeNodeCard from './TreeNodeCard'
import BracketCard from './BracketCard'
import BracketRounds from './BracketRounds'
// Стили общие для Vue 2 и Vue 3 — лежат в core, чтобы не расходились.
// Они попадают прямо в бандл и подключаются сами: отдельный импорт в проекте не нужен.
import { injectStyles } from '@bigplay/tree-view-core'
import styles from '@bigplay/tree-view-core/style.css?inline'

injectStyles(styles)

export { TreeView, TreeNodeCard, BracketCard, BracketRounds }

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

/** Плагин: `Vue.use(TreeViewPlugin)` регистрирует компоненты глобально. */
export const TreeViewPlugin = {
  install(Vue: VueConstructor) {
    Vue.component('TreeView', TreeView)
    Vue.component('TreeNodeCard', TreeNodeCard)
    Vue.component('BracketCard', BracketCard)
    Vue.component('BracketRounds', BracketRounds)
  },
}

export default TreeViewPlugin
