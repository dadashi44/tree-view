import type { VueConstructor } from 'vue'
import TreeView from './TreeView'
import TreeNodeCard from './TreeNodeCard'
// Стили общие для Vue 2 и Vue 3 — лежат в core, чтобы не расходились.
// Они попадают прямо в бандл и подключаются сами: отдельный импорт в проекте не нужен.
import { injectStyles } from '@dadashi/tree-view-core'
import styles from '@dadashi/tree-view-core/style.css?inline'

injectStyles(styles)

export { TreeView, TreeNodeCard }

export type {
  Accessors,
  Direction,
  Layout,
  LayoutLink,
  LayoutNode,
  LinkStyle,
  ScaleLimits,
  Transform,
  TreeNode,
  TreeViewOptions,
} from '@dadashi/tree-view-core'
export { DEFAULT_OPTIONS } from '@dadashi/tree-view-core'

/** Плагин: `Vue.use(TreeViewPlugin)` регистрирует компоненты глобально. */
export const TreeViewPlugin = {
  install(Vue: VueConstructor) {
    Vue.component('TreeView', TreeView)
    Vue.component('TreeNodeCard', TreeNodeCard)
  },
}

export default TreeViewPlugin
