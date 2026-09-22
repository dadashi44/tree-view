<script setup lang="ts">
/**
 * Bounty-сетка: те же данные и та же вёрстка, что на клиенте,
 * но связи между группами рисует библиотека, а не вручную свёрстанные палки.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { TreeView, type TreeViewOptions } from '@dadashi/tree-view'
import BountyGroupCard from './BountyGroupCard.vue'
import { toBountyNodes, type BountyNode, type BountyNodeTeam } from '../data/buildBounty'
import type { BountyRound } from '../data/bounty'

const props = defineProps<{
  rounds: BountyRound[]
  interactive: boolean
}>()

const emit = defineEmits<{ (e: 'select', node: BountyNode, team: BountyNodeTeam): void }>()

const COLUMN_WIDTH = 260

const options: TreeViewOptions = {
  nodeWidth: 200,
  nodeHeight: 94,
  levelGap: COLUMN_WIDTH - 200,
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
      <div v-if="!interactive" class="rounds">
        <div
          v-for="round in rounds"
          :key="round.id"
          class="round-item"
          :style="{ width: `${COLUMN_WIDTH}px` }"
        >
          {{ round.name }}
        </div>
      </div>

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
    </div>
  </section>
</template>
