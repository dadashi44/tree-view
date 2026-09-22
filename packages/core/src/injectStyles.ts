/**
 * Вставляет стили в документ один раз.
 *
 * Зачем: чтобы в проекте не приходилось писать лишний
 * `import '@bigplay/tree-view/style.css'` — всё работает сразу после установки.
 *
 * На сервере (SSR) функция ничего не делает: там нет `document`,
 * а на клиенте стили появятся при гидрации.
 */
export function injectStyles(css: string, id = 'tree-view-styles'): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(id)) return

  const style = document.createElement('style')
  style.id = id
  style.textContent = css

  document.head.appendChild(style)
}
