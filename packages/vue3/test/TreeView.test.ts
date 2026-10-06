import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick, type Component } from 'vue'
import TreeViewComponent from '../src/TreeView.vue'

/**
 * У компонента типизированные generic-пропсы; в тестах нам удобнее передавать
 * произвольные наборы пропов, поэтому монтируем его как обычный компонент.
 */
const TreeView = TreeViewComponent as unknown as Component

interface Match {
  id: string
  name: string
  children?: Match[]
}

const bracket: Match = {
  id: 'final',
  name: 'Финал',
  children: [
    { id: 'sf-1', name: 'Полуфинал 1' },
    { id: 'sf-2', name: 'Полуфинал 2' },
  ],
}

const options = { nodeWidth: 100, nodeHeight: 50, levelGap: 50, siblingGap: 20 }

function mountTree(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(TreeView, {
    props: { data: bracket, options, fitOnMount: false, ...props },
    slots,
  })
}

describe('TreeView — отрисовка', () => {
  it('рисует по одному блоку на узел', () => {
    const wrapper = mountTree()
    expect(wrapper.findAll('.tree-view__node')).toHaveLength(3)
  })

  it('рисует линии между родителем и детьми', () => {
    const wrapper = mountTree()
    expect(wrapper.findAll('.tree-view__link')).toHaveLength(2)
    expect(wrapper.find('.tree-view__link').attributes('d')).toBeTruthy()
  })

  it('расставляет узлы по посчитанным координатам', () => {
    const wrapper = mountTree()
    const first = wrapper.findAll('.tree-view__node')[0]!

    expect(first.attributes('style')).toContain('width: 100px')
    expect(first.attributes('style')).toContain('height: 50px')
    expect(first.attributes('style')).toContain('top: 0px')
  })

  it('показывает карточку по умолчанию с именем узла', () => {
    const wrapper = mountTree()
    expect(wrapper.text()).toContain('Финал')
    expect(wrapper.text()).toContain('Полуфинал 1')
  })

  it('пустые данные не ломают компонент', () => {
    const wrapper = mountTree({ data: null })
    expect(wrapper.findAll('.tree-view__node')).toHaveLength(0)
  })
})

describe('TreeView — кастомизация узла', () => {
  it('слот #node полностью заменяет карточку', () => {
    const wrapper = mountTree(
      {},
      {
        node: (slotProps: { data: Match; depth: number }) =>
          h('div', { class: 'my-card' }, `${slotProps.data.name} / ${slotProps.depth}`),
      },
    )

    expect(wrapper.findAll('.my-card')).toHaveLength(3)
    expect(wrapper.find('.my-card').text()).toBe('Финал / 0')
    expect(wrapper.find('.tree-view-card').exists()).toBe(false)
  })

  it('в слот приходит toggle, и он работает', async () => {
    const wrapper = mountTree(
      {},
      {
        node: (slotProps: { data: Match; toggle: () => void }) =>
          h('button', { class: 'my-toggle', onClick: slotProps.toggle }, slotProps.data.name),
      },
    )

    await wrapper.find('.my-toggle').trigger('click')

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(1)
  })

  it('слот #link позволяет нарисовать свои линии', () => {
    const wrapper = mountTree(
      {},
      { link: (slotProps: { link: { path: string } }) => h('path', { class: 'my-link', d: slotProps.link.path }) },
    )

    expect(wrapper.findAll('.my-link')).toHaveLength(2)
    expect(wrapper.find('.tree-view__link').exists()).toBe(false)
  })

  it('nodeClass добавляет класс — строкой и функцией', () => {
    expect(mountTree({ nodeClass: 'flat' }).find('.tree-view__node').classes()).toContain('flat')

    const wrapper = mountTree({ nodeClass: (node: { depth: number }) => `level-${node.depth}` })
    expect(wrapper.find('.tree-view__node').classes()).toContain('level-0')
  })
})

describe('TreeView — сворачивание', () => {
  it('по умолчанию клик ничего не сворачивает', async () => {
    const wrapper = mountTree()

    await wrapper.find('.tree-view__node').trigger('click')

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(3)
  })

  it('с collapsible клик прячет и возвращает детей', async () => {
    const wrapper = mountTree({ collapsible: true })

    await wrapper.find('.tree-view__node').trigger('click')
    expect(wrapper.findAll('.tree-view__node')).toHaveLength(1)

    await wrapper.find('.tree-view__node').trigger('click')
    expect(wrapper.findAll('.tree-view__node')).toHaveLength(3)
  })

  it('не меняет данные пользователя', async () => {
    const wrapper = mountTree({ collapsible: true })

    await wrapper.find('.tree-view__node').trigger('click')

    expect(bracket.children).toHaveLength(2)
  })

  it('кнопка на карточке по умолчанию сворачивает ветку', async () => {
    const wrapper = mountTree()

    await wrapper.find('.tree-view-card__toggle').trigger('click')

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(1)
  })
})

describe('TreeView — события', () => {
  it('node-click отдаёт узел и событие мыши', async () => {
    const wrapper = mountTree()

    await wrapper.find('.tree-view__node').trigger('click')

    const payload = wrapper.emitted('node-click')?.[0] as [{ id: string }, MouseEvent]
    expect(payload[0].id).toBe('final')
    expect(payload[1]).toBeInstanceOf(Object)
  })

  it('toggle сообщает новое состояние узла', async () => {
    const wrapper = mountTree({ collapsible: true })

    await wrapper.find('.tree-view__node').trigger('click')

    const payload = wrapper.emitted('toggle')?.[0] as [{ id: string }, boolean]
    expect(payload[0].id).toBe('final')
    expect(payload[1]).toBe(true)
  })
})

describe('TreeView — обновление данных', () => {
  it('перерисовывается при замене данных (частая боль старой версии)', async () => {
    const wrapper = mountTree()

    await wrapper.setProps({
      data: { id: 'root', name: 'Новый', children: [{ id: 'a', name: 'A' }] },
    })

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(2)
    expect(wrapper.text()).toContain('Новый')
  })

  it('реагирует на смену настроек', async () => {
    const wrapper = mountTree()

    await wrapper.setProps({ options: { ...options, nodeWidth: 300 } })

    expect(wrapper.find('.tree-view__node').attributes('style')).toContain('width: 300px')
  })

  it('понимает плоский список через getParentId', async () => {
    const wrapper = mountTree({
      data: [
        { id: 'a', parentId: null, name: 'A' },
        { id: 'b', parentId: 'a', name: 'B' },
      ],
      getParentId: (item: { parentId: string | null }) => item.parentId,
    })
    await nextTick()

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(2)
    expect(wrapper.findAll('.tree-view__link')).toHaveLength(1)
  })
})

describe('TreeView — холст', () => {
  it('размер холста равен размеру дерева', () => {
    const wrapper = mountTree()
    const style = wrapper.find('.tree-view__canvas').attributes('style')!

    expect(style).toContain('width: 220px')
    expect(style).toContain('height: 150px')
  })

  it('zoomIn меняет масштаб холста', async () => {
    const wrapper = mountTree()

    ;(wrapper.vm as unknown as { zoomIn: () => void }).zoomIn()
    await nextTick()

    expect(wrapper.find('.tree-view__canvas').attributes('style')).toContain('scale(1.2)')
  })

  it('по умолчанию контейнер растягивается на родителя', () => {
    expect(mountTree().attributes('style')).toBeUndefined()
  })

  it('size="content" задаёт контейнеру размер дерева и не обрезает его', () => {
    const wrapper = mountTree({ size: 'content' })
    const style = wrapper.attributes('style')!

    expect(style).toContain('width: 220px')
    expect(style).toContain('height: 150px')
    expect(style).toContain('overflow: visible')
    expect(wrapper.classes()).toContain('tree-view--content')
  })

  it('без pannable не добавляет класс перетаскивания', () => {
    expect(mountTree({ pannable: false }).classes()).not.toContain('tree-view--pannable')
  })
})

describe('TreeView — виртуализация', () => {
  /** Плоский список из 200 корней: заведомо больше порога виртуализации. */
  const many = Array.from({ length: 200 }, (_, index) => ({ id: `n-${index}`, name: `Узел ${index}` }))

  const bigOptions = { nodeWidth: 100, nodeHeight: 50, levelGap: 50, siblingGap: 20 }

  /** Холст «виден» вот в таком прямоугольнике — happy-dom сам размеров не считает. */
  function stubViewport(box: { left: number; top: number; width: number; height: number }) {
    const original = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function rect() {
      return {
        left: box.left,
        top: box.top,
        right: box.left + box.width,
        bottom: box.top + box.height,
        width: box.width,
        height: box.height,
        x: box.left,
        y: box.top,
        toJSON: () => ({}),
      } as DOMRect
    }
    return () => {
      Element.prototype.getBoundingClientRect = original
    }
  }

  it('рисует только видимую часть большого дерева', async () => {
    const restore = stubViewport({ left: 0, top: 0, width: 600, height: 400 })

    const wrapper = mount(TreeView, { props: { data: many, options: bigOptions, fitOnMount: false } })
    await nextTick()
    const drawn = wrapper.findAll('.tree-view__node').length

    expect(drawn).toBeGreaterThan(0)
    expect(drawn).toBeLessThan(many.length)

    restore()
  })

  it('с virtualize: false рисует всё', async () => {
    const restore = stubViewport({ left: 0, top: 0, width: 600, height: 400 })

    const wrapper = mount(TreeView, {
      props: { data: many, options: bigOptions, fitOnMount: false, virtualize: false },
    })
    await nextTick()

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(many.length)

    restore()
  })

  it('маленькое дерево рисуется целиком, фильтр не включается', async () => {
    const restore = stubViewport({ left: 0, top: 0, width: 1, height: 1 })

    const wrapper = mountTree()
    await nextTick()

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(3)

    restore()
  })

  it('при скролле страницы в DOM попадают другие узлы', async () => {
    let restore = stubViewport({ left: 0, top: 0, width: 600, height: 400 })

    const wrapper = mount(TreeView, { props: { data: many, options: bigOptions, fitOnMount: false } })
    await nextTick()
    const before = wrapper.findAll('.tree-view__node').map((node) => node.attributes('style'))

    // Холст уехал влево — значит, видно уже другую его часть.
    restore()
    restore = stubViewport({ left: -5000, top: 0, width: 24000, height: 400 })
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    const after = wrapper.findAll('.tree-view__node').map((node) => node.attributes('style'))

    expect(after).not.toEqual(before)
    expect(after.length).toBeGreaterThan(0)

    restore()
  })

  it('размер холста остаётся полным, а не по видимой части', async () => {
    const restore = stubViewport({ left: 0, top: 0, width: 600, height: 400 })

    const wrapper = mount(TreeView, { props: { data: many, options: bigOptions, fitOnMount: false } })
    await nextTick()

    // 200 узлов: 199 шагов по 120px плюс ширина последней карточки.
    expect(wrapper.find('.tree-view__canvas').attributes('style')).toContain('width: 23980px')

    restore()
  })
})
