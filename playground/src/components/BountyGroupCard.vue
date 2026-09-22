<script setup lang="ts">
/**
 * Карточка группы bounty-сетки: название группы и команды с очками.
 * Лучший результат в группе подсвечен, «моя команда» — золотым,
 * как в BountyGridMatch на клиенте.
 */
import type { BountyNode, BountyNodeTeam } from '../data/buildBounty'

defineProps<{ node: BountyNode }>()

const emit = defineEmits<{ (e: 'select', team: BountyNodeTeam): void }>()
</script>

<template>
  <div class="bounty">
    <p class="bounty__name">#{{ node.name }}</p>

    <div class="bounty__teams">
      <div
        v-for="team in node.teams"
        :key="team.id"
        class="bounty__team"
        :class="{ 'bounty__team--best': team.isBest, 'bounty__team--my': team.isMyTeam }"
        :title="team.isMyTeam ? 'Моя команда' : undefined"
        @click="emit('select', team)"
      >
        <span class="bounty__team-name">{{ team.name }}</span>
        <span class="bounty__team-score">{{ team.score }}</span>
      </div>
    </div>
  </div>
</template>
