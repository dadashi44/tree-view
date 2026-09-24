<script setup lang="ts">
/**
 * Карточка матча турнирной сетки — та самая, что на сайте:
 * победитель синий, проигравший серый, команда пользователя в рамке
 * с подсказкой, техническое поражение показывает «ТП» и объяснение по наведению.
 *
 * Какие строки рисовать — решает `buildBracketCard` из core, поэтому
 * версия для Vue 2 выглядит точно так же.
 */
import { computed, ref } from 'vue'
import {
  buildBracketCard,
  type BracketCardMatch,
  type BracketCardRow,
  type BracketCardTeam,
} from '@bigplay/tree-view-core'

const props = withDefaults(
  defineProps<{
    /** Матч: нужны только команды. */
    match: BracketCardMatch | null | undefined
    /** Сколько строк рисовать. У финала — одна. */
    rows?: number
    /** Подсказка над карточкой с моей командой. Пустая строка — не показывать. */
    myTeamHint?: string
    /** Текст в ячейке счёта при техническом поражении. */
    techDefeatLabel?: string
    /** Подсказка по наведению на техническое поражение. */
    techDefeatHint?: string
    /** У матча есть предыдущие — рисуем кнопку, которая их сворачивает. */
    hasChildren?: boolean
    /** Предыдущие матчи сейчас свёрнуты. */
    collapsed?: boolean
    /** Подписи кнопки для screen reader. */
    collapseHint?: string
    expandHint?: string
  }>(),
  {
    rows: undefined,
    myTeamHint: 'Нажми для перехода в матч 👇',
    techDefeatLabel: 'ТП',
    techDefeatHint: 'Техническое поражение',
    hasChildren: false,
    collapsed: false,
    collapseHint: 'Свернуть предыдущие матчи',
    expandHint: 'Показать предыдущие матчи',
  },
)

const emit = defineEmits<{
  (e: 'select', team: BracketCardTeam, row: BracketCardRow): void
  (e: 'toggle'): void
}>()

const hoveredKey = ref<string | null>(null)

const card = computed(() =>
  buildBracketCard(props.match, { rows: props.rows, techDefeatLabel: props.techDefeatLabel }),
)

function onRowClick(row: BracketCardRow): void {
  if (row.team) emit('select', row.team, row)
}
</script>

<template>
  <div class="tv-bracket" :class="{ 'tv-bracket--my-team': card.hasMyTeam }">
    <div v-if="card.hasMyTeam && myTeamHint" class="tv-bracket__hint">{{ myTeamHint }}</div>

    <!--
      Кнопка стоит со стороны предыдущих матчей — туда же уходят линии.
      data-tv-no-pan: нажатие не должно утаскивать холст.
    -->
    <button
      v-if="hasChildren"
      type="button"
      class="tv-bracket__toggle"
      :class="{ 'tv-bracket__toggle--collapsed': collapsed }"
      :title="collapsed ? expandHint : collapseHint"
      :aria-label="collapsed ? expandHint : collapseHint"
      :aria-expanded="!collapsed"
      data-tv-no-pan
      @click.stop="emit('toggle')"
    >
      {{ collapsed ? '+' : '−' }}
    </button>

    <!-- Строки лежат в своей обёртке: она держит скругление и контур, поэтому
         матч читается как один блок, а не как список из четырёх команд.
         Подсказка и кнопка остаются снаружи — их обрезать нельзя. -->
    <div class="tv-bracket__rows">
      <div
        v-for="row in card.rows"
        :key="row.key"
        class="tv-bracket__row"
        :class="{
          'tv-bracket__row--winner': row.isWinner,
          'tv-bracket__row--loser': row.isLoser && !row.isEmpty,
          'tv-bracket__row--my': row.isMyTeam,
          'tv-bracket__row--empty': row.isEmpty,
        }"
        :title="row.isMyTeam ? 'Моя команда' : undefined"
        @click="onRowClick(row)"
        @mouseenter="hoveredKey = row.key"
        @mouseleave="hoveredKey = null"
      >
        <template v-if="row.team">
          <span v-if="row.isTechDefeat && hoveredKey === row.key" class="tv-bracket__tooltip">
            {{ techDefeatHint }}
          </span>

          <span class="tv-bracket__name">{{ row.team.name }}</span>
          <span class="tv-bracket__score">{{ row.score }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
