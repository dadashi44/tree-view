import type { App, Plugin } from 'vue'
import TreeView from './TreeView.vue'
import TreeNodeCard from './TreeNodeCard.vue'
// Стили общие для Vue 2 и Vue 3 — лежат в core, чтобы не расходились.
// Они попадают прямо в бандл и подключаются сами: отдельный импорт в проекте не нужен.
import { injectStyles } from '@dadashi44/tree-view-core'
import styles from '@dadashi44/tree-view-core/style.css?inline'

injectStyles(styles)

export { TreeView, TreeNodeCard }
export { useTreeLayout } from './useTreeLayout'
export { usePanZoom } from './usePanZoom'

// Типы из core переэкспортируем, чтобы их не приходилось ставить отдельно.
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
} from '@dadashi44/tree-view-core'
export { DEFAULT_OPTIONS } from '@dadashi44/tree-view-core'

/** Плагин: `app.use(TreeViewPlugin)` регистрирует компоненты глобально. */
export const TreeViewPlugin: Plugin = {
  install(app: App) {
    app.component('TreeView', TreeView)
    app.component('TreeNodeCard', TreeNodeCard)
  },
}

export default TreeViewPlugin
