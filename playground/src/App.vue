<script setup lang="ts">
import { ref } from 'vue'
import BracketGrid from './components/BracketGrid.vue'
import { lowerGrid, upperGrid } from './data/tournament'
import type { BracketMatch, BracketTeam } from './data/buildBracket'

/** Формат данных: плоский список из API или заранее собранное дерево. */
const format = ref<'flat' | 'tree'>('flat')
/** Интерактивный режим — перетаскивание и зум вместо обычного скролла. */
const interactive = ref(false)

const selected = ref<BracketMatch | null>(null)

function onSelect(match: BracketMatch, team: BracketTeam) {
  console.log('Клик по команде', team.name, 'в матче', match.name)
  selected.value = match
}
</script>

<template>
  <div class="page">
    <h1 class="page__title">Турнирная сетка</h1>
    <p class="page__subtitle">
      Данные, вёрстка карточек и стили — как на странице турнира в clientFrontend.
    </p>

    <div class="toolbar">
      <label>
        Формат данных
        <select v-model="format">
          <option value="flat">плоский список из API</option>
          <option value="tree">собранное дерево</option>
        </select>
      </label>

      <label>
        <input v-model="interactive" type="checkbox" />
        интерактивный режим (перетаскивание и зум)
      </label>
    </div>

    <BracketGrid
      title="Верхняя сетка"
      :grid="upperGrid"
      :format="format"
      :interactive="interactive"
      @select="onSelect"
    />

    <BracketGrid
      title="Нижняя сетка"
      :grid="lowerGrid"
      :format="format"
      :interactive="interactive"
      @select="onSelect"
    />

    <!-- Упрощённая модалка матча: в проде здесь MatchDetailModal с запросом за деталями. -->
    <div v-if="selected" class="modal" @click.self="selected = null">
      <div class="modal__body">
        <h3 class="modal__title">{{ selected.name }}</h3>

        <div
          v-for="team in selected.teams"
          :key="team.id"
          class="modal__row"
          :class="{ 'modal__row--winner': team.isWinner }"
        >
          <span>{{ team.name }}</span>
          <span>{{ team.isTechDefeat ? 'ТП' : team.score }}</span>
        </div>

        <button class="modal__close" @click="selected = null">Закрыть</button>
      </div>
    </div>
  </div>
</template>
