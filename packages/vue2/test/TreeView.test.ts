import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TreeView from '../src/TreeView'

const bracket = {
  id: 'final',
  name: 'Финал',
  children: [
    { id: 'sf-1', name: 'Полуфинал 1' },
    { id: 'sf-2', name: 'Полуфинал 2' },
  ],
}

const options = { nodeWidth: 100, nodeHeight: 50, levelGap: 50, siblingGap: 20 }

function mountTree(propsData: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return mount(TreeView, {
    propsData: { data: bracket, options, fitOnMount: false, ...propsData },
    ...extra,
  })
}

describe('TreeView (Vue 2) — отрисовка', () => {
  it('рисует по одному блоку на узел', () => {
    expect(mountTree().findAll('.tree-view__node')).toHaveLength(3)
  })

  it('рисует линии между родителем и детьми', () => {
    const wrapper = mountTree()

    expect(wrapper.findAll('.tree-view__link')).toHaveLength(2)
    expect(wrapper.find('.tree-view__link').attributes('d')).toBeTruthy()
  })

  it('расставляет узлы по посчитанным координатам', () => {
    const style = mountTree().findAll('.tree-view__node').at(0).attributes('style')!

    expect(style).toContain('width: 100px')
    expect(style).toContain('height: 50px')
  })

  it('показывает карточку по умолчанию с именем узла', () => {
    expect(mountTree().text()).toContain('Полуфинал 1')
  })

  it('пустые данные не ломают компонент', () => {
    expect(mountTree({ data: null }).findAll('.tree-view__node')).toHaveLength(0)
  })

  it('размер холста равен размеру дерева', () => {
    const style = mountTree().find('.tree-view__canvas').attributes('style')!

    expect(style).toContain('width: 220px')
    expect(style).toContain('height: 150px')
  })
})

describe('TreeView (Vue 2) — кастомизация', () => {
  it('scoped-слот node заменяет карточку', () => {
    const wrapper = mountTree({}, {
      scopedSlots: { node: '<div class="my-card">{{ props.data.name }} / {{ props.depth }}</div>' },
    })

    expect(wrapper.findAll('.my-card')).toHaveLength(3)
    expect(wrapper.find('.my-card').text()).toBe('Финал / 0')
    expect(wrapper.find('.tree-view-card').exists()).toBe(false)
  })

  it('слот link заменяет линии', () => {
    const wrapper = mountTree({}, {
      scopedSlots: { link: '<path class="my-link" :d="props.link.path" />' },
    })

    expect(wrapper.findAll('.my-link')).toHaveLength(2)
    expect(wrapper.find('.tree-view__link').exists()).toBe(false)
  })

  it('nodeClass добавляет класс функцией', () => {
    const wrapper = mountTree({ nodeClass: (node: { depth: number }) => `level-${node.depth}` })
    expect(wrapper.find('.tree-view__node').classes()).toContain('level-0')
  })
})

describe('TreeView (Vue 2) — поведение', () => {
  it('с collapsible клик сворачивает и разворачивает ветку', async () => {
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

  it('сообщает о клике по узлу', async () => {
    const wrapper = mountTree()

    await wrapper.find('.tree-view__node').trigger('click')

    const payload = wrapper.emitted('node-click')![0] as [{ id: string }, MouseEvent]
    expect(payload[0].id).toBe('final')
  })

  it('перерисовывается при замене данных', async () => {
    const wrapper = mountTree()

    await wrapper.setProps({ data: { id: 'root', name: 'Новый', children: [{ id: 'a', name: 'A' }] } })

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(2)
    expect(wrapper.text()).toContain('Новый')
  })

  it('понимает плоский список через getParentId', () => {
    const wrapper = mountTree({
      data: [
        { id: 'a', parentId: null, name: 'A' },
        { id: 'b', parentId: 'a', name: 'B' },
      ],
      getParentId: (item: { parentId: string | null }) => item.parentId,
    })

    expect(wrapper.findAll('.tree-view__node')).toHaveLength(2)
  })

  it('zoomIn меняет масштаб холста', async () => {
    const wrapper = mountTree()

    ;(wrapper.vm as unknown as { zoomIn: () => void }).zoomIn()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.tree-view__canvas').attributes('style')).toContain('scale(1.2)')
  })

  it('size="content" задаёт контейнеру размер дерева', () => {
    const wrapper = mountTree({ size: 'content' })
    const style = wrapper.attributes('style')!

    expect(style).toContain('width: 220px')
    expect(style).toContain('height: 150px')
    expect(wrapper.classes()).toContain('tree-view--content')
  })
})
