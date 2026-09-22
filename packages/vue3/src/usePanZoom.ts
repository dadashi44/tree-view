import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import {
  IDENTITY_TRANSFORM,
  PanZoomController,
  type ScaleLimits,
  type Size,
  type Transform,
} from '@dadashi44/tree-view-core'

export interface UsePanZoomParams {
  /** Элемент, который слушаем: по нему тянут и крутят колесо. */
  element: Ref<HTMLElement | null>
  pannable: () => boolean
  zoomable: () => boolean
  limits: () => ScaleLimits
}

/**
 * Тонкая обёртка над `PanZoomController` из core:
 * переносит его состояние в реактивный `ref` и следит за жизненным циклом.
 */
export function usePanZoom(params: UsePanZoomParams) {
  const transform = ref<Transform>({ ...IDENTITY_TRANSFORM })

  const controller = new PanZoomController({
    pannable: params.pannable,
    zoomable: params.zoomable,
    limits: params.limits,
    onChange: (next) => {
      transform.value = next
    },
  })

  watch(
    params.element,
    (element, _previous, onCleanup) => {
      if (!element) return

      controller.attach(element)
      onCleanup(() => controller.detach())
    },
    { immediate: true },
  )

  onBeforeUnmount(() => controller.detach())

  return {
    transform,
    fit: (content: Size, padding?: number) => controller.fit(content, padding),
    zoomIn: () => controller.zoomIn(),
    zoomOut: () => controller.zoomOut(),
    reset: () => controller.reset(),
    setTransform: (next: Transform) => controller.set(next),
  }
}
