<script setup lang="ts">
/**
 * Одна сетка: шапка с названиями раундов + дерево матчей.
 * Точно такая же конструкция используется на странице турнира в clientFrontend.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { TreeView, type TreeViewOptions } from '@dadashi/tree-view'
import MatchCard from './MatchCard.vue'
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

/** Ширина колонки раунда = карточка + промежуток между уровнями. */
const COLUMN_WIDTH = 250

const options: TreeViewOptions = {
  nodeWidth: 211,
  nodeHeight: 80,
  levelGap: COLUMN_WIDTH - 211,
  siblingGap: 32,
  direction: 'right-to-left',
  linkStyle: 'elbow',
}

const data = computed(() => (props.format === 'flat' ? toFlatMatches(props.grid) : toTreeMatches(props.grid)))

/** В плоском формате связи описаны полем nextId — дерево собирать не нужно. */
const getParentId = computed(() =>
  props.format === 'flat' ? (match: BracketMatch) => match.nextId : undefined,
)

const isFinal = (match: BracketMatch) => match.nextId == null

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
      <div v-if="!interactive" class="rounds">
        <div
          v-for="round in grid.rounds"
          :key="round.id"
          class="round-item"
          :style="{ width: `${COLUMN_WIDTH}px` }"
        >
          {{ round.name }}
        </div>
      </div>

      <TreeView
        ref="tree"
        :data="data"
        :options="options"
        :get-id="(match: BracketMatch) => match.id"
        :get-parent-id="getParentId"
        :size="interactive ? 'fill' : 'content'"
        :pannable="interactive"
        :zoomable="interactive"
        :fit-on-mount="interactive"
        :style="interactive ? { height: '520px' } : undefined"
      >
        <template #node="{ data: match }">
          <MatchCard
            :match="match as BracketMatch"
            :is-final="isFinal(match as BracketMatch)"
            @select="emit('select', match as BracketMatch, $event)"
          />
        </template>
      </TreeView>
    </div>
  </section>
</template>
