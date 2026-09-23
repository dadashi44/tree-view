<script setup lang="ts">
/**
 * Полоса раундов над турнирной сеткой — та самая, что на странице турнира.
 *
 * Делает три вещи:
 *  1. рисует названия раундов колонками той же ширины, что и уровни сетки;
 *  2. центрует матчи внутри раунда — сетка в слоте получает отступ слева
 *     в половину `levelGap`, иначе карточки прижимаются к левому краю колонки;
 *  3. на узком экране превращается в свайпер: раунд занимает всю ширину блока,
 *     шапка и сетка листаются пальцем вместе и прилипают к границе раунда,
 *     а пройденные раунды прячутся — вместе с линиями, которые из них выходят.
 *
 * Сетка при этом остаётся одна — линии между оставшимися матчами на месте.
 * Меняются только два числа: промежуток между раундами растягивается до
 * ширины экрана, а матчи внутри раунда встают ближе друг к другу. Настройки
 * с этими числами компонент отдаёт в слот — их и передают в `TreeView`.
 *
 * Что рисовать, решает `buildBracketRounds` из core, поэтому версия
 * для Vue 2 выглядит точно так же.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  DEFAULT_OPTIONS,
  MOBILE_MEDIA_QUERY,
  buildBracketRounds,
  findScrollParent,
  hideRoundsBefore,
  horizontalBox,
  levelGapForWidth,
  nodesInColumn,
  offsetWithin,
  resolveOptions,
  roundAtScroll,
  roundOfDepth,
  roundScrollLeft,
  smoothScrollLeft,
  watchChildren,
  watchMedia,
  watchWidth,
  type BracketRound,
  type BracketRoundColumn,
  type TreeViewOptions,
} from '@bigplay/tree-view-core'

const props = withDefaults(
  defineProps<{
    /** Раунды по порядку — от первого к финалу. */
    rounds: BracketRound[] | null | undefined
    /** Настройки сетки — те же, что уходят в `TreeView`. */
    options?: Partial<TreeViewOptions>
    /** Показывать полосу. Содержимое слота рисуется в любом случае. */
    isShow?: boolean
    /** Расстояние между матчами одного раунда в режиме свайпера. */
    swipeSiblingGap?: number
    /** Прятать пройденные раунды и линии, которые из них выходят. */
    hidePassed?: boolean
    /** Включить свайпер принудительно. Не передан — решает ширина экрана. */
    swipe?: boolean
    /** Медиавыражение «узкий экран», при котором включается свайпер. */
    mobileQuery?: string
  }>(),
  {
    options: undefined,
    isShow: true,
    swipeSiblingGap: 12,
    hidePassed: true,
    swipe: undefined,
    mobileQuery: MOBILE_MEDIA_QUERY,
  },
)

const emit = defineEmits<{
  (e: 'select', round: BracketRoundColumn): void
  (e: 'round', index: number): void
}>()

const rootElement = ref<HTMLElement | null>(null)
const contentElement = ref<HTMLElement | null>(null)

/** Узкий ли экран. До монтирования — нет: на сервере ширину знать неоткуда. */
const isNarrow = ref(false)
/** Сколько места отведено полосе: по нему считается ширина раунда в свайпере. */
const available = ref(0)
/** Раунд, на котором стоит прокрутка. Меняется прямо во время свайпа. */
const current = ref(0)

/** Полосы нет — свайпать нечего: сетку в это время таскают и масштабируют. */
const isSwipe = computed(() => props.isShow && (props.swipe ?? isNarrow.value))

const base = computed(() => resolveOptions(props.options))

/**
 * Карточки матчей одной ширины, поэтому у сетки с раундами `nodeWidth` —
 * число. Если это всё-таки функция, считать колонки не по чему: берём значение
 * по умолчанию, чтобы полоса не развалилась.
 */
const nodeWidth = computed(() =>
  typeof base.value.nodeWidth === 'number'
    ? base.value.nodeWidth
    : (DEFAULT_OPTIONS.nodeWidth as number),
)

const levelGap = computed(() =>
  isSwipe.value ? levelGapForWidth(available.value, nodeWidth.value) : base.value.levelGap,
)

const model = computed(() =>
  buildBracketRounds(props.rounds, { nodeWidth: nodeWidth.value, levelGap: levelGap.value }),
)

/** Дерево турнирной сетки растёт справа налево: первый раунд — самый глубокий. */
const mirrored = computed(
  () => base.value.direction === 'right-to-left' || base.value.direction === 'bottom-to-top',
)

/** Настройки для сетки: в свайпере — с растянутыми раундами и сжатыми матчами. */
const gridOptions = computed<Partial<TreeViewOptions>>(() =>
  isSwipe.value
    ? { ...props.options, levelGap: levelGap.value, siblingGap: props.swipeSiblingGap }
    : { ...props.options },
)

const barStyle = computed(() => ({ width: `${model.value.width}px` }))

const contentStyle = computed(() =>
  props.isShow ? { paddingLeft: `${model.value.offset}px` } : undefined,
)

/** Прячет всё, что осталось позади: карточки пройденных раундов и их линии. */
function applyHidden(): void {
  const content = contentElement.value
  if (!content) return

  const hideBefore = isSwipe.value && props.hidePassed ? current.value : 0
  const count = model.value.columns.length

  hideRoundsBefore(content, hideBefore, (depth) => roundOfDepth(depth, count, mirrored.value))
}

function onScroll(): void {
  const element = rootElement.value
  if (!element || !isSwipe.value) return

  const width = model.value.columns[0]?.width ?? 0
  const next = roundAtScroll(element.scrollLeft, width, model.value.columns.length)
  if (next === current.value) return

  current.value = next
  emit('round', next)
}

watch([current, isSwipe, model], () => applyHidden())

const stop: Array<() => void> = []

onMounted(() => {
  stop.push(
    watchMedia(props.mobileQuery, (matches) => {
      isNarrow.value = matches
    }),
    watchWidth(rootElement.value?.parentElement, (width) => {
      available.value = width
    }),
    // Сетка перерисовывает карточки — скрытое расставляем заново.
    watchChildren(contentElement.value, applyHidden),
  )

  applyHidden()
})

onBeforeUnmount(() => stop.forEach((off) => off()))

/**
 * Подводит сетку к матчам раунда — только по горизонтали.
 *
 * Меряем по самой карточке: так раунд встаёт по центру экрана точно, а у финала
 * прокрутка упирается в правый край и он виден целиком. Карточек не нашли
 * (виртуализация) — считаем по колонке, она той же ширины и на том же месте.
 *
 * Вертикаль не трогаем: страница остаётся там, где была.
 */
function scrollToRound(column: BracketRoundColumn): void {
  const element = rootElement.value
  if (!element) return

  // В свайпере прокручивается сама полоса, иначе — блок с overflow-x вокруг неё.
  const container = isSwipe.value ? element : findScrollParent(element)
  if (!container) return

  const content = contentElement.value
  // Карточки раунда стоят друг под другом, поэтому по горизонтали годится любая.
  const card = content
    ? nodesInColumn(content, column.index, column.width, model.value.offset)[0]
    : undefined

  const box = card
    ? horizontalBox(card, container)
    : { left: offsetWithin(element, container) + column.index * column.width, width: column.width }

  smoothScrollLeft(
    container,
    roundScrollLeft({
      ...box,
      viewport: container.clientWidth,
      scrollWidth: container.scrollWidth,
    }),
  )
}

function onSelect(column: BracketRoundColumn): void {
  emit('select', column)
  scrollToRound(column)
}

defineExpose({ scrollToRound })
</script>

<template>
  <div
    ref="rootElement"
    class="tv-rounds"
    :class="{ 'tv-rounds--swipe': isSwipe }"
    @scroll="onScroll"
  >
    <div v-if="isShow" class="tv-rounds__bar" :style="barStyle">
      <div
        v-for="column in model.columns"
        :key="column.key"
        class="tv-rounds__item"
        :style="{ width: `${column.width}px` }"
        @click="onSelect(column)"
      >
        <slot name="round" :round="column">{{ column.name }}</slot>
      </div>
    </div>

    <div ref="contentElement" class="tv-rounds__content" :style="contentStyle">
      <!--
        Сюда кладут саму сетку. `options` — настройки, подогнанные под экран:
        в свайпере раунд занимает всю ширину, а матчи внутри стоят ближе.
      -->
      <slot :options="gridOptions" :is-swipe="isSwipe" :round="current" />
    </div>
  </div>
</template>
