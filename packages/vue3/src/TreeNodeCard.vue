<script setup lang="ts">
/**
 * Карточка узла по умолчанию.
 * Нужна только чтобы «из коробки» что-то отображалось —
 * в реальном проекте обычно используют слот #node и рисуют свой блок.
 */
defineProps<{
  label: string
  hasChildren?: boolean
  collapsed?: boolean
}>()

const emit = defineEmits<{ (e: 'toggle'): void }>()
</script>

<template>
  <div class="tree-view-card">
    <span class="tree-view-card__label">{{ label }}</span>

    <button
      v-if="hasChildren"
      type="button"
      class="tree-view-card__toggle"
      data-tv-no-pan
      :aria-label="collapsed ? 'Развернуть' : 'Свернуть'"
      @click.stop="emit('toggle')"
    >
      {{ collapsed ? '+' : '−' }}
    </button>
  </div>
</template>
