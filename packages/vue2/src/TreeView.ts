import Vue, { type PropType, type VNode } from 'vue'
import {
  applyCollapsed,
  layoutTree,
  PanZoomController,
  toCssTransform,
  toggleCollapsed,
  toTree,
  type Accessors,
  type Layout,
  type LayoutNode,
  type ScaleLimits,
  type Transform,
  type TreeViewOptions,
} from '@bigplay/tree-view-core'
import TreeNodeCard from './TreeNodeCard'

/** Данные узла могут быть какими угодно — библиотека читает их только аксессорами. */
type NodeData = any

/**
 * Контроллеры держим здесь, а не в data(): Vue 2 сделал бы объект реактивным,
 * а внутри него DOM-элемент и Map — наблюдать за ними незачем.
 */
const controllers = new WeakMap<Vue, PanZoomController>()

export default Vue.extend({
  name: 'TreeView',
  props: {
    /** Объект, массив объектов или плоский список (вместе с `getParentId`). */
    data: { type: [Object, Array] as PropType<NodeData>, default: null },
    /** Размеры и направление. Можно передать только часть полей. */
    options: { type: Object as PropType<Partial<TreeViewOptions>>, default: undefined },
    /** Как достать id узла. По умолчанию — поле `id`. */
    getId: { type: Function as PropType<Accessors<NodeData>['getId']>, default: undefined },
    /** Как достать детей. По умолчанию — поле `children`. */
    getChildren: { type: Function as PropType<Accessors<NodeData>['getChildren']>, default: undefined },
    /** Как достать id родителя. Передан — значит данные плоские. */
    getParentId: { type: Function as PropType<Accessors<NodeData>['getParentId']>, default: undefined },
    /** Клик по узлу сворачивает/разворачивает ветку. */
    collapsible: { type: Boolean, default: false },
    /** Разрешить перетаскивание холста. */
    pannable: { type: Boolean, default: true },
    /** Разрешить зум колесом и «щипком». */
    zoomable: { type: Boolean, default: true },
    /** Вписать дерево в контейнер при первом отображении. */
    fitOnMount: { type: Boolean, default: true },
    /**
     * Как компонент занимает место:
     *  - `'fill'` (по умолчанию) — растягивается на родителя, лишнее обрезается;
     *  - `'content'` — контейнер принимает размер дерева и ничего не обрезает.
     */
    size: { type: String as PropType<'fill' | 'content'>, default: 'fill' },
    /** Пределы масштаба. */
    scaleLimits: { type: Object as PropType<ScaleLimits>, default: undefined },
    /** Дополнительный класс на обёртке узла — строкой или функцией. */
    nodeClass: {
      type: [String, Function] as PropType<string | ((node: LayoutNode<NodeData>) => string)>,
      default: undefined,
    },
  },

  data() {
    return {
      /** Массив, а не Set: Vue 2 не умеет наблюдать за Set. */
      collapsedIds: [] as string[],
      transform: { x: 0, y: 0, scale: 1 } as Transform,
    }
  },

  computed: {
    layout(): Layout<NodeData> {
      const tree = toTree<NodeData>(this.data, {
        getId: this.getId,
        getChildren: this.getChildren,
        getParentId: this.getParentId,
      })

      return layoutTree(applyCollapsed(tree, new Set(this.collapsedIds)), this.options)
    },

    canvasStyle(): Record<string, string> {
      return {
        width: `${this.layout.width}px`,
        height: `${this.layout.height}px`,
        transform: toCssTransform(this.transform),
      }
    },

    rootStyle(): Record<string, string> | undefined {
      if (this.size !== 'content') return undefined

      return {
        width: `${this.layout.width * this.transform.scale}px`,
        height: `${this.layout.height * this.transform.scale}px`,
        overflow: 'visible',
      }
    },
  },

  mounted() {
    const controller = new PanZoomController({
      pannable: () => this.pannable,
      zoomable: () => this.zoomable,
      limits: this.scaleLimits ? () => this.scaleLimits : undefined,
      onChange: (transform) => {
        this.transform = transform
        this.$emit('transform', transform)
      },
    })

    controller.attach(this.$el as HTMLElement)
    controllers.set(this, controller)

    if (this.fitOnMount) this.$nextTick(() => this.fit())
  },

  beforeDestroy() {
    controllers.get(this)?.detach()
    controllers.delete(this)
  },

  methods: {
    /** Вписывает дерево в видимую область. */
    fit(padding?: number): void {
      controllers.get(this)?.fit({ width: this.layout.width, height: this.layout.height }, padding)
    },
    zoomIn(): void {
      controllers.get(this)?.zoomIn()
    },
    zoomOut(): void {
      controllers.get(this)?.zoomOut()
    },
    resetTransform(): void {
      controllers.get(this)?.reset()
    },
    setTransform(transform: Transform): void {
      controllers.get(this)?.set(transform)
    },
    /** Развернуть все свёрнутые ветки. */
    expandAll(): void {
      this.collapsedIds = []
    },
    /** Свернуть или развернуть узел по id. */
    toggle(id: string): void {
      this.collapsedIds = [...toggleCollapsed(new Set(this.collapsedIds), id)]
    },

    toggleNode(node: LayoutNode<NodeData>): void {
      this.toggle(node.id)
      this.$emit('toggle', node, this.collapsedIds.includes(node.id))
    },

    onNodeClick(node: LayoutNode<NodeData>, event: MouseEvent): void {
      this.$emit('node-click', node, event)
      if (this.collapsible && node.hasChildren) this.toggleNode(node)
    },

    nodeStyle(node: LayoutNode<NodeData>): Record<string, string> {
      return {
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
      }
    },

    nodeClassOf(node: LayoutNode<NodeData>): string | undefined {
      return typeof this.nodeClass === 'function' ? this.nodeClass(node) : this.nodeClass
    },

    /** Подпись карточки по умолчанию: name → title → label → id. */
    labelOf(node: LayoutNode<NodeData>): string {
      const data = node.data as { name?: string; title?: string; label?: string } | null
      return data?.name ?? data?.title ?? data?.label ?? node.id
    },

    /** Своя карточка из scoped-слота или карточка по умолчанию. */
    renderNodeContent(h: typeof Vue.prototype.$createElement, node: LayoutNode<NodeData>): VNode | VNode[] {
      const slot = this.$scopedSlots.node

      if (slot) {
        return (slot({
          node,
          data: node.data,
          depth: node.depth,
          collapsed: node.collapsed,
          hasChildren: node.hasChildren,
          toggle: () => this.toggleNode(node),
        }) ?? []) as VNode[]
      }

      return h(TreeNodeCard, {
        props: { label: this.labelOf(node), hasChildren: node.hasChildren, collapsed: node.collapsed },
        on: { toggle: () => this.toggleNode(node) },
      })
    },
  },

  render(h): VNode {
    const layout = this.layout
    const linkSlot = this.$scopedSlots.link

    const links = layout.links.map((link) =>
      linkSlot
        ? ((linkSlot({ link }) ?? []) as VNode[])
        : h('path', { key: link.id, class: 'tree-view__link', attrs: { d: link.path } }),
    )

    const nodes = layout.nodes.map((node) =>
      h(
        'div',
        {
          key: node.id,
          class: ['tree-view__node', this.nodeClassOf(node)],
          style: this.nodeStyle(node),
          on: { click: (event: MouseEvent) => this.onNodeClick(node, event) },
        },
        ([] as VNode[]).concat(this.renderNodeContent(h, node)),
      ),
    )

    return h(
      'div',
      {
        class: [
          'tree-view',
          { 'tree-view--pannable': this.pannable, 'tree-view--content': this.size === 'content' },
        ],
        style: this.rootStyle,
      },
      [
        h('div', { class: 'tree-view__canvas', style: this.canvasStyle }, [
          h(
            'svg',
            {
              class: 'tree-view__links',
              attrs: { width: layout.width, height: layout.height },
            },
            links as VNode[],
          ),
          ...nodes,
        ]),
      ],
    )
  },
})
