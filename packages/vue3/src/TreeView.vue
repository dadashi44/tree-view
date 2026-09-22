<script setup lang="ts" generic="T">
/**
 * Компонент-обёртка. Вся математика — в пакете core, здесь только
 * реактивность, разметка и события.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  DEFAULT_SCALE_LIMITS,
  toCssTransform,
  type Accessors,
  type LayoutNode,
  type ScaleLimits,
  type Transform,
  type TreeViewOptions,
} from '@bigplay/tree-view-core'
import TreeNodeCard from './TreeNodeCard.vue'
import { usePanZoom } from './usePanZoom'
import { useTreeLayout } from './useTreeLayout'

const props = withDefaults(
  defineProps<{
    /** Данные: объект, массив объектов или плоский список (вместе с `getParentId`). */
    data: T | T[] | null | undefined
    /** Размеры и направление. Можно передать только часть полей. */
    options?: Partial<TreeViewOptions<T>>
    /** Как достать id узла. По умолчанию — поле `id`. */
    getId?: Accessors<T>['getId']
    /** Как достать детей. По умолчанию — поле `children`. */
    getChildren?: Accessors<T>['getChildren']
    /** Как достать id родителя. Передан — значит данные плоские. */
    getParentId?: Accessors<T>['getParentId']
    /** Клик по узлу сворачивает/разворачивает ветку. */
    collapsible?: boolean
    /** Разрешить перетаскивание холста. */
    pannable?: boolean
    /** Разрешить зум колесом и «щипком». */
    zoomable?: boolean
    /** Вписать дерево в контейнер при первом отображении. */
    fitOnMount?: boolean
    /**
     * Как компонент занимает место:
     *  - `'fill'` (по умолчанию) — растягивается на родителя, лишнее обрезается,
     *    дерево двигают мышью;
     *  - `'content'` — контейнер принимает размер дерева и ничего не обрезает.
     *    Нужен, когда сетка стоит внутри страницы со своим скроллом.
     */
    size?: 'fill' | 'content'
    /** Пределы масштаба. */
    scaleLimits?: ScaleLimits
    /** Дополнительный класс на обёртке узла — строкой или функцией. */
    nodeClass?: string | ((node: LayoutNode<T>) => string)
  }>(),
  {
    options: undefined,
    getId: undefined,
    getChildren: undefined,
    getParentId: undefined,
    collapsible: false,
    pannable: true,
    zoomable: true,
    fitOnMount: true,
    size: 'fill',
    scaleLimits: undefined,
    nodeClass: undefined,
  },
)

const emit = defineEmits<{
  (e: 'node-click', node: LayoutNode<T>, event: MouseEvent): void
  (e: 'toggle', node: LayoutNode<T>, collapsed: boolean): void
  (e: 'transform', transform: Transform): void
}>()

const rootElement = ref<HTMLElement | null>(null)

const { layout, isCollapsed, toggle, expandAll } = useTreeLayout<T>({
  data: () => props.data,
  options: () => props.options,
  accessors: () => ({
    getId: props.getId,
    getChildren: props.getChildren,
    getParentId: props.getParentId,
  }),
})

const panZoom = usePanZoom({
  element: rootElement,
  pannable: () => props.pannable,
  zoomable: () => props.zoomable,
  limits: () => props.scaleLimits ?? DEFAULT_SCALE_LIMITS,
})

const canvasStyle = computed(() => ({
  width: `${layout.value.width}px`,
  height: `${layout.value.height}px`,
  transform: toCssTransform(panZoom.transform.value),
}))

const rootStyle = computed(() => {
  if (props.size !== 'content') return undefined

  const { scale } = panZoom.transform.value
  return {
    width: `${layout.value.width * scale}px`,
    height: `${layout.value.height * scale}px`,
    overflow: 'visible',
  }
})

function nodeStyle(node: LayoutNode<T>) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
  }
}

function nodeClassOf(node: LayoutNode<T>): string | undefined {
  return typeof props.nodeClass === 'function' ? props.nodeClass(node) : props.nodeClass
}

/** Подпись карточки по умолчанию: name → title → label → id. */
function labelOf(node: LayoutNode<T>): string {
  const data = node.data as { name?: string; title?: string; label?: string } | null
  return data?.name ?? data?.title ?? data?.label ?? node.id
}

function toggleNode(node: LayoutNode<T>): void {
  toggle(node.id)
  emit('toggle', node, isCollapsed(node.id))
}

function onNodeClick(node: LayoutNode<T>, event: MouseEvent): void {
  emit('node-click', node, event)
  if (props.collapsible && node.hasChildren) toggleNode(node)
}

/** Вписывает дерево в видимую область. */
function fit(padding?: number): void {
  panZoom.fit({ width: layout.value.width, height: layout.value.height }, padding)
}

onMounted(() => {
  if (props.fitOnMount) void nextTick(() => fit())
})

watch(
  () => panZoom.transform.value,
  (transform) => emit('transform', transform),
)

defineExpose({
  fit,
  zoomIn: panZoom.zoomIn,
  zoomOut: panZoom.zoomOut,
  resetTransform: panZoom.reset,
  setTransform: panZoom.setTransform,
  expandAll,
  toggle,
  layout,
  transform: panZoom.transform,
})
</script>

<template>
  <div
    ref="rootElement"
    class="tree-view"
    :class="{ 'tree-view--pannable': pannable, 'tree-view--content': size === 'content' }"
    :style="rootStyle"
  >
    <div class="tree-view__canvas" :style="canvasStyle">
      <svg class="tree-view__links" :width="layout.width" :height="layout.height">
        <template v-for="link in layout.links" :key="link.id">
          <slot name="link" :link="link">
            <path class="tree-view__link" :d="link.path" />
          </slot>
        </template>
      </svg>

      <div
        v-for="node in layout.nodes"
        :key="node.id"
        class="tree-view__node"
        :class="nodeClassOf(node)"
        :style="nodeStyle(node)"
        @click="onNodeClick(node, $event)"
      >
        <!--
          Главная точка кастомизации: сюда подставляют свою карточку.
          Доступно всё, что может понадобиться для отрисовки и управления.
        -->
        <slot
          name="node"
          :node="node"
          :data="node.data"
          :depth="node.depth"
          :collapsed="node.collapsed"
          :has-children="node.hasChildren"
          :toggle="() => toggleNode(node)"
        >
          <TreeNodeCard
            :label="labelOf(node)"
            :has-children="node.hasChildren"
            :collapsed="node.collapsed"
            @toggle="toggleNode(node)"
          />
        </slot>
      </div>
    </div>
  </div>
</template>
