<script setup lang="ts">
/**
 * Полоса раундов над турнирной сеткой — та самая, что на странице турнира.
 *
 * Делает три вещи:
 *  1. рисует названия раундов колонками той же ширины, что и уровни сетки;
 *  2. центрует матчи внутри раунда — сетка в слоте получает отступ слева
 *     в половину `levelGap`, иначе карточки прижимаются к левому краю колонки;
 *  3. на узком экране добавляет раундам нажатие: сетка плавно подъезжает
 *     к матчам этого раунда. Выглядит полоса при этом везде одинаково.
 *
 * Данные сетки полоса не трогает: на экране всегда вся сетка целиком.
 *
 * Что рисовать, решает `buildBracketRounds` из core, поэтому версия
 * для Vue 2 выглядит точно так же.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  MOBILE_MEDIA_QUERY,
  buildBracketRounds,
  findScrollParent,
  horizontalBox,
  nodesInColumn,
  offsetWithin,
  roundScrollLeft,
  smoothScrollLeft,
  watchMedia,
  type BracketRound,
  type BracketRoundColumn,
} from '@bigplay/tree-view-core'

const props = withDefaults(
  defineProps<{
    /** Раунды по порядку — от первого к финалу. */
    rounds: BracketRound[] | null | undefined
    /** Ширина карточки матча — то же число, что в `nodeWidth` у сетки. */
    nodeWidth?: number
    /** Промежуток между раундами — то же число, что в `levelGap` у сетки. */
    levelGap?: number
    /** Показывать полосу. Содержимое слота рисуется в любом случае. */
    isShow?: boolean
    /** Нажатие на раунд подводит к нему сетку. Не передан — решает ширина экрана. */
    scrollOnClick?: boolean
    /** Медиавыражение «узкий экран», при котором нажатие включается. */
    mobileQuery?: string
  }>(),
  {
    nodeWidth: 180,
    levelGap: 60,
    isShow: true,
    scrollOnClick: undefined,
    mobileQuery: MOBILE_MEDIA_QUERY,
  },
)

const emit = defineEmits<{ (e: 'select', round: BracketRoundColumn): void }>()

const rootElement = ref<HTMLElement | null>(null)
const contentElement = ref<HTMLElement | null>(null)

/** Узкий ли экран. До монтирования — нет: на сервере ширину знать неоткуда. */
const isNarrow = ref(false)
let unwatch: (() => void) | null = null

onMounted(() => {
  unwatch = watchMedia(props.mobileQuery, (matches) => {
    isNarrow.value = matches
  })
})

onBeforeUnmount(() => unwatch?.())

/** Полосы нет — нажимать не на что. */
const isClickable = computed(() => props.isShow && (props.scrollOnClick ?? isNarrow.value))

const model = computed(() =>
  buildBracketRounds(props.rounds, { nodeWidth: props.nodeWidth, levelGap: props.levelGap }),
)

const barStyle = computed(() => ({ width: `${model.value.width}px` }))

const contentStyle = computed(() =>
  props.isShow ? { paddingLeft: `${model.value.offset}px` } : undefined,
)

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
  const container = findScrollParent(element)
  if (!element || !container) return

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

/** Нажатие — только на узком экране: на широком колонка раунда это просто подпись. */
function onSelect(column: BracketRoundColumn): void {
  if (!isClickable.value) return

  emit('select', column)
  scrollToRound(column)
}
</script>

<template>
  <div ref="rootElement" class="tv-rounds">
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
      <!-- Сюда кладут саму сетку: ей достаётся отступ, центрующий матчи. -->
      <slot />
    </div>
  </div>
</template>
