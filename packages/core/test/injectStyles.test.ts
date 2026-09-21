// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { injectStyles } from '../src/injectStyles'

describe('injectStyles', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('добавляет тег style с переданным CSS', () => {
    injectStyles('.a { color: red }')

    const style = document.getElementById('dadashi-tree-view-styles')
    expect(style?.tagName).toBe('STYLE')
    expect(style?.textContent).toBe('.a { color: red }')
  })

  it('не дублирует стили при повторном вызове', () => {
    injectStyles('.a { color: red }')
    injectStyles('.a { color: red }')

    expect(document.querySelectorAll('style')).toHaveLength(1)
  })

  it('разные id живут рядом — можно подключить свою тему', () => {
    injectStyles('.a {}', 'first')
    injectStyles('.b {}', 'second')

    expect(document.querySelectorAll('style')).toHaveLength(2)
  })
})
