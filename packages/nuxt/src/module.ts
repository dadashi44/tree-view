import { addComponent, defineNuxtModule } from '@nuxt/kit'
// Типы параметров указываем явно: в чистом дереве node_modules типы @nuxt/kit
// могут не доехать до @nuxt/schema и молча превратиться в any — а с ними и setup.
import type { Nuxt } from '@nuxt/schema'

export interface ModuleOptions {
  /** Префикс к именам компонентов: `prefix: 'App'` даст `<AppTreeView />`. */
  prefix?: string
}

/**
 * Модуль делает всего две вещи:
 * 1. регистрирует компоненты глобально (импортировать их не нужно);
 * 2. просит Nuxt транспилировать пакет — иначе SSR спотыкается об ESM.
 *
 * Стили подключать не надо: они лежат внутри пакета и вставляются сами.
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@bigplay/tree-view-nuxt',
    configKey: 'treeView',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    prefix: '',
  },
  setup(options: ModuleOptions, nuxt: Nuxt) {
    const prefix = options.prefix ?? ''

    nuxt.options.build.transpile.push('@bigplay/tree-view')

    addComponent({ name: `${prefix}TreeView`, export: 'TreeView', filePath: '@bigplay/tree-view' })
    addComponent({ name: `${prefix}TreeNodeCard`, export: 'TreeNodeCard', filePath: '@bigplay/tree-view' })
    addComponent({ name: `${prefix}BracketCard`, export: 'BracketCard', filePath: '@bigplay/tree-view' })
  },
})
