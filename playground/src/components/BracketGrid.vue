<script setup lang="ts">
/**
 * Одна сетка: шапка с названиями раундов + дерево матчей.
 * Точно такая же конструкция используется на странице турнира в clientFrontend.
 */
import { computed, nextTick, ref, watch } from 'vue'
import {
  BracketCard,
  BracketRounds,
  TreeView,
  bracketCardHeight,
  type TreeViewOptions,
} from '@bigplay/tree-view'
import { toFlatMatches, toTreeMatches, type BracketMatch, type BracketTeam } from '../data/buildBracket'
import type { ApiGrid } from '../data/tournament'

const props = defineProps<{
  title: string
  grid: ApiGrid
  /** 'flat' — отдаём матчи как есть, 'tree' — заранее собранное дерево. */
  format: 'flat' | 'tree'
  /** Интерактивный режим: перетаскивание и зум вместо обычного скролла страницы. */
  interactive: boolean
}>()

const emit = defineEmits<{ (e: 'select', match: BracketMatch, team: BracketTeam): void }>()

const isFinal = (match: BracketMatch) => match.nextId == null

/** Сколько строк в карточке: у финала победитель один. */
const rowsOf = (match: BracketMatch) => (isFinal(match) ? 1 : 2)

const options: TreeViewOptions<BracketMatch> = {
  nodeWidth: 211,
  // Высота — по числу строк карточки: финал ровно в одну строку,
  // остальные матчи в две. Линия всё равно придёт в середину карточки.
  nodeHeight: (node) => bracketCardHeight(node.data, { rows: rowsOf(node.data) }),
  levelGap: 39,
  siblingGap: 32,
  direction: 'right-to-left',
  linkStyle: 'elbow',
}

const data = computed(() => (props.format === 'flat' ? toFlatMatches(props.grid) : toTreeMatches(props.grid)))

/** В плоском формате связи описаны полем nextId — дерево собирать не нужно. */
const getParentId = computed(() =>
  props.format === 'flat' ? (match: BracketMatch) => match.nextId : undefined,
)

const tree = ref<{ fit: () => void } | null>(null)

// При переключении в интерактивный режим вписываем сетку в новый контейнер:
// fitOnMount срабатывает только при первом показе.
watch(
  () => props.interactive,
  (isInteractive) => {
    if (isInteractive) void nextTick(() => tree.value?.fit())
  },
)
</script>

<template>
  <section class="grid-section">
    <h4 class="grid-section__title">{{ title }}</h4>

    <div class="grid-scroll">
      <!-- В интерактивном режиме сетку двигают и масштабируют,
           поэтому колонки раундов перестали бы совпадать с матчами. -->
      <BracketRounds
        :rounds="grid.rounds"
        :options="options"
        :is-show="!interactive"
        @select="(round) => console.log('Клик по раунду', round.name)"
      >
        <!-- options из слота подогнаны под экран: на мобильном это свайпер. -->
        <template #default="{ options: gridOptions }">
          <TreeView
            ref="tree"
            :data="data"
            :options="gridOptions"
            :get-id="(match: BracketMatch) => match.id"
            :get-parent-id="getParentId"
            :size="interactive ? 'fill' : 'content'"
            :pannable="interactive"
            :zoomable="interactive"
            :fit-on-mount="interactive"
            :style="interactive ? { height: '520px' } : undefined"
          >
            <template #node="{ data: match }">
              <!-- Карточка из пакета: та же вёрстка, что в админке и на клиенте. -->
              <BracketCard
                :match="match as BracketMatch"
                :rows="rowsOf(match as BracketMatch)"
                @select="emit('select', match as BracketMatch, $event as BracketTeam)"
              />
            </template>
          </TreeView>
        </template>
      </BracketRounds>
    </div>
  </section>
</template>
