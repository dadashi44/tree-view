import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { estimateVisibleRect, measureVisibleRect, type Rect } from '@bigplay/tree-view-core'

/**
 * Следит за тем, какая часть холста сейчас видна.
 *
 * Пересчитывается там же, где это меняется: при перетаскивании и зуме,
 * при скролле страницы и при изменении размеров окна. Отдельный троттлинг
 * не нужен — и те, и другие события браузер отдаёт не чаще кадра.
 */
export function useVisibleRect(canvas: Ref<HTMLElement | null>, scale: () => number, enabled: () => boolean) {
  // До первого измерения берём размер окна — иначе первый кадр нарисует всё дерево.
  const rect = ref<Rect | null>(enabled() ? estimateVisibleRect() : null)

  function update(): void {
    rect.value = enabled() ? measureVisibleRect(canvas.value, scale()) : null
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', update, { passive: true, capture: true })
    window.addEventListener('resize', update, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', update, { capture: true })
    window.removeEventListener('resize', update)
  })

  return { rect, update }
}
