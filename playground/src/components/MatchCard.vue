<script setup lang="ts">
/**
 * Карточка матча — вёрстка один в один как на клиенте турниров:
 * победитель синий, проигравший серый, «моя команда» в рамке с подсказкой,
 * при наведении на техническое поражение показывается подсказка.
 */
import { computed, ref } from 'vue'
import type { BracketMatch, BracketTeam } from '../data/buildBracket'

const props = defineProps<{
  match: BracketMatch
  /** У финала победитель один — вторая ячейка не нужна. */
  isFinal?: boolean
}>()

const emit = defineEmits<{ (e: 'select', team: BracketTeam): void }>()

const hoveredTeam = ref<BracketTeam | null>(null)

const hasMyTeam = computed(() => props.match.teams.some((team) => team.isMyTeam))

/** Сколько пустых ячеек дорисовать, если матч ещё не сыгран. */
const emptySlots = computed(() => {
  const expected = props.isFinal ? 1 : 2
  return Math.max(0, expected - props.match.teams.length)
})
</script>

<template>
  <div class="match" :class="{ 'match--my-team': hasMyTeam }">
    <div v-if="hasMyTeam" class="match__hint">Нажми для перехода в матч 👇</div>

    <div
      v-for="team in match.teams"
      :key="team.id"
      class="match__team"
      :class="{
        'match__team--winner': team.isWinner,
        'match__team--loser': !team.isWinner,
        'match__team--my': team.isMyTeam,
      }"
      :title="team.isMyTeam ? 'Моя команда' : undefined"
      @click="emit('select', team)"
      @mouseenter="hoveredTeam = team"
      @mouseleave="hoveredTeam = null"
    >
      <span v-if="hoveredTeam === team && team.isTechDefeat" class="match__tooltip">
        Техническое поражение
      </span>

      <span class="match__name">{{ team.name }}</span>
      <span class="match__score">{{ team.isTechDefeat ? 'ТП' : team.score }}</span>
    </div>

    <div v-for="slot in emptySlots" :key="`empty-${slot}`" class="match__team match__team--empty" />
  </div>
</template>
