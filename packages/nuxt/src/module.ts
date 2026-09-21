import { addComponent, defineNuxtModule } from '@nuxt/kit'

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
    name: '@dadashi/tree-view-nuxt',
    configKey: 'treeView',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    prefix: '',
  },
  setup(options, nuxt) {
    const prefix = options.prefix ?? ''

    nuxt.options.build.transpile.push('@dadashi/tree-view')

    addComponent({ name: `${prefix}TreeView`, export: 'TreeView', filePath: '@dadashi/tree-view' })
    addComponent({ name: `${prefix}TreeNodeCard`, export: 'TreeNodeCard', filePath: '@dadashi/tree-view' })
  },
})
