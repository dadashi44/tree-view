import type { TreeViewOptions } from './types'

/** Значения по умолчанию. Меняются пропом `options` — частично, по одному полю. */
export const DEFAULT_OPTIONS: TreeViewOptions = {
  nodeWidth: 180,
  nodeHeight: 64,
  levelGap: 60,
  siblingGap: 16,
  direction: 'top-to-bottom',
  linkStyle: 'elbow',
}

/**
 * Дополняет пользовательские настройки значениями по умолчанию.
 * Благодаря этому можно передать только `{ nodeWidth: 240 }` и ничего не сломать.
 */
export function resolveOptions(options?: Partial<TreeViewOptions>): TreeViewOptions {
  return { ...DEFAULT_OPTIONS, ...options }
}
