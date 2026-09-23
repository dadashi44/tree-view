<script setup lang="ts">
/**
 * Bounty-сетка: те же данные и та же вёрстка, что на клиенте,
 * но связи между группами рисует библиотека, а не вручную свёрстанные палки.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { BracketRounds, TreeView, type TreeViewOptions } from '@bigplay/tree-view'
import BountyGroupCard from './BountyGroupCard.vue'
import { toBountyNodes, type BountyNode, type BountyNodeTeam } from '../data/buildBounty'
import type { BountyRound } from '../data/bounty'

const props = defineProps<{
  rounds: BountyRound[]
  interactive: boolean
}>()

const emit = defineEmits<{ (e: 'select', node: BountyNode, team: BountyNodeTeam): void }>()

/** Размеры карточки и промежутка. По ним же полоса раундов считает свои колонки. */
const NODE_WIDTH = 200
const LEVEL_GAP = 60

/** Из чего складывается высота карточки группы: подпись + строки команд. */
const NAME_HEIGHT = 20
const TEAM_HEIGHT = 38
const TEAM_GAP = 1

const options: TreeViewOptions<BountyNode> = {
  nodeWidth: NODE_WIDTH,
  // Групп с разным числом команд в данных пока нет, но высота считается
  // честно — сетка не поедет, если такая группа появится.
  nodeHeight: (node) =>
    NAME_HEIGHT + node.data.teams.length * TEAM_HEIGHT + Math.max(0, node.data.teams.length - 1) * TEAM_GAP,
  levelGap: LEVEL_GAP,
  siblingGap: 26,
  direction: 'right-to-left',
  linkStyle: 'elbow',
}

const nodes = computed(() => toBountyNodes(props.rounds))

const tree = ref<{ fit: () => void } | null>(null)

watch(
  () => props.interactive,
  (isInteractive) => {
    if (isInteractive) void nextTick(() => tree.value?.fit())
  },
)
</script>

<template>
  <section class="grid-section">
    <h4 class="grid-section__title">Bounty</h4>

    <div class="grid-scroll">
      <!-- В интерактивном режиме сетку двигают и масштабируют,
           поэтому колонки раундов перестали бы совпадать с группами. -->
      <BracketRounds
        :rounds="rounds"
        :node-width="NODE_WIDTH"
        :level-gap="LEVEL_GAP"
        :is-show="!interactive"
      >
        <TreeView
          ref="tree"
          :data="nodes"
          :options="options"
          :get-parent-id="(node: BountyNode) => node.parentId"
          :size="interactive ? 'fill' : 'content'"
          :pannable="interactive"
          :zoomable="interactive"
          :fit-on-mount="interactive"
          :style="interactive ? { height: '520px' } : undefined"
        >
          <template #node="{ data: node }">
            <BountyGroupCard
              :node="node as BountyNode"
              @select="emit('select', node as BountyNode, $event)"
            />
          </template>
        </TreeView>
      </BracketRounds>
    </div>
  </section>
</template>
