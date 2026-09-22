<script setup lang="ts">
import { ref } from 'vue'
import BracketGrid from './components/BracketGrid.vue'
import BountyGrid from './components/BountyGrid.vue'
import StressGrid from './components/StressGrid.vue'
import { lowerGrid, upperGrid } from './data/tournament'
import { bountyGrid } from './data/bounty'
import type { BracketMatch, BracketTeam } from './data/buildBracket'
import type { BountyNode, BountyNodeTeam } from './data/buildBounty'

/** Типы сеток — те же, что на сайте турниров. */
const gridTypes = [
  { id: 'single', name: 'Single elimination' },
  { id: 'double', name: 'Double elimination' },
  { id: 'bounty', name: 'Bounty' },
  { id: 'stress', name: 'Нагрузка' },
] as const

type GridType = (typeof gridTypes)[number]['id']

const gridType = ref<GridType>('double')
/** Формат данных для сеток на выбывание: плоский список из API или собранное дерево. */
const format = ref<'flat' | 'tree'>('flat')
/** Интерактивный режим — перетаскивание и зум вместо обычного скролла. */
const interactive = ref(false)

/** То, что показывает модалка: заголовок и строки со счётом. */
const selected = ref<{ title: string; rows: Array<{ name: string; score: string; best: boolean }> } | null>(null)

function onMatchSelect(match: BracketMatch, team: BracketTeam) {
  console.log('Клик по команде', team.name, 'в матче', match.name)
  selected.value = {
    title: match.name,
    rows: match.teams.map((item) => ({
      name: item.name,
      score: item.isTechDefeat ? 'ТП' : String(item.score),
      best: item.isWinner,
    })),
  }
}

function onGroupSelect(node: BountyNode, team: BountyNodeTeam) {
  console.log('Клик по команде', team.name, 'в группе', node.name)
  selected.value = {
    title: `Группа #${node.name}`,
    rows: node.teams.map((item) => ({ name: item.name, score: String(item.score), best: item.isBest })),
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page__title">Турнирные сетки</h1>
    <p class="page__subtitle">
      Данные, вёрстка карточек и стили — как на страницах турниров в clientFrontend.
    </p>

    <div class="tabs">
      <button
        v-for="type in gridTypes"
        :key="type.id"
        class="tab"
        :class="{ 'tab--active': gridType === type.id }"
        @click="gridType = type.id"
      >
        {{ type.name }}
      </button>
    </div>

    <div class="toolbar">
      <label v-if="gridType === 'single' || gridType === 'double'">
        Формат данных
        <select v-model="format">
          <option value="flat">плоский список из API</option>
          <option value="tree">собранное дерево</option>
        </select>
      </label>

      <label v-if="gridType !== 'stress'">
        <input v-model="interactive" type="checkbox" />
        интерактивный режим (перетаскивание и зум)
      </label>
    </div>

    <!-- Single elimination: одна сетка. -->
    <BracketGrid
      v-if="gridType === 'single'"
      title="Основная сетка"
      :grid="upperGrid"
      :format="format"
      :interactive="interactive"
      @select="onMatchSelect"
    />

    <!-- Double elimination: верхняя и нижняя сетки, у каждой свои раунды. -->
    <template v-else-if="gridType === 'double'">
      <BracketGrid
        title="Верхняя сетка"
        :grid="upperGrid"
        :format="format"
        :interactive="interactive"
        @select="onMatchSelect"
      />
      <BracketGrid
        title="Нижняя сетка"
        :grid="lowerGrid"
        :format="format"
        :interactive="interactive"
        @select="onMatchSelect"
      />
    </template>

    <!-- Bounty: узел — группа команд, связи выводятся по позиции в раунде. -->
    <BountyGrid
      v-else-if="gridType === 'bounty'"
      :rounds="bountyGrid"
      :interactive="interactive"
      @select="onGroupSelect"
    />

    <!-- Нагрузка: сетка на сотни и тысячи матчей, со своими замерами. -->
    <StressGrid v-else />

    <!-- Упрощённая модалка: в проде здесь MatchDetailModal с запросом за деталями. -->
    <div v-if="selected" class="modal" @click.self="selected = null">
      <div class="modal__body">
        <h3 class="modal__title">{{ selected.title }}</h3>

        <div
          v-for="row in selected.rows"
          :key="row.name"
          class="modal__row"
          :class="{ 'modal__row--winner': row.best }"
        >
          <span>{{ row.name }}</span>
          <span>{{ row.score }}</span>
        </div>

        <button class="modal__close" @click="selected = null">Закрыть</button>
      </div>
    </div>
  </div>
</template>
