<script setup lang="ts">
/**
 * Проверка на большой сетке: сколько времени занимает отрисовка
 * и сколько получается DOM-узлов. Нужна, чтобы отвечать на вопрос
 * «а если матчей тысяча» замерами, а не на глаз.
 *
 * Режим тот же, что на страницах турниров: обычный скролл страницы,
 * без перетаскивания и зума. Высота карточки считается по числу строк.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { BracketCard, TreeView, bracketCardHeight, type TreeViewOptions } from '@bigplay/tree-view'
import { stressBracket } from '../data/stress'
import type { BracketMatch } from '../data/buildBracket'

const sizes = [
  { rounds: 8, label: '255 матчей' },
  { rounds: 10, label: '1023 матча' },
  { rounds: 12, label: '4095 матчей' },
]

const rounds = ref(10)
/** Виртуализация: рисовать только то, что видно. Выключается для сравнения. */
const virtualize = ref(true)

const matches = computed(() => stressBracket(rounds.value))

const rowsOf = (match: BracketMatch) => (match.nextId == null ? 1 : 2)

const options: TreeViewOptions<BracketMatch> = {
  nodeWidth: 211,
  nodeHeight: (node) => bracketCardHeight(node.data, { rows: rowsOf(node.data) }),
  levelGap: 39,
  siblingGap: 32,
  direction: 'right-to-left',
  linkStyle: 'elbow',
}

const stats = ref<{ ms: number; nodes: number; elements: number } | null>(null)
const root = ref<HTMLElement | null>(null)

/** Замер: от смены данных до момента, когда браузер их отрисовал. */
watch(
  [matches, virtualize],
  async () => {
    const started = performance.now()
    stats.value = null

    await nextTick()
    const ms = performance.now() - started

    stats.value = {
      ms: Math.round(ms),
      nodes: matches.value.length,
      elements: root.value?.querySelectorAll('*').length ?? 0,
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="grid-section">
    <h4 class="grid-section__title">Нагрузка</h4>

    <div class="toolbar">
      <label>
        Размер сетки
        <select v-model.number="rounds">
          <option v-for="size in sizes" :key="size.rounds" :value="size.rounds">{{ size.label }}</option>
        </select>
      </label>

      <label>
        <input v-model="virtualize" type="checkbox" />
        виртуализация
      </label>

      <span v-if="stats">
        отрисовка <b>{{ stats.ms }} мс</b>, узлов <b>{{ stats.nodes }}</b>, элементов в DOM
        <b>{{ stats.elements }}</b>
      </span>
    </div>

    <div ref="root" class="grid-scroll">
      <TreeView
        :data="matches"
        :options="options"
        :get-id="(match: BracketMatch) => match.id"
        :get-parent-id="(match: BracketMatch) => match.nextId"
        :virtualize="virtualize"
        size="content"
        :pannable="false"
        :zoomable="false"
        :fit-on-mount="false"
      >
        <template #node="{ data: match }">
          <BracketCard :match="match as BracketMatch" :rows="rowsOf(match as BracketMatch)" />
        </template>
      </TreeView>
    </div>
  </section>
</template>
