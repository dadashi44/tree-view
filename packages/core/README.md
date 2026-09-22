# @dadashi44/tree-view-core

Раскладка дерева на чистом TypeScript. Ни Vue, ни d3, ни других зависимостей.

```bash
npm i @dadashi44/tree-view-core
```

```ts
import { toTree, layoutTree } from '@dadashi44/tree-view-core'

const layout = layoutTree(toTree(data), { direction: 'right-to-left' })

layout.nodes   // [{ id, data, x, y, width, height, depth, collapsed, hasChildren }, ...]
layout.links   // [{ id, source, target, path }, ...] — path готов для <path d="...">
layout.width   // размер холста
layout.height
```

Что внутри:

| Функция | Зачем |
| --- | --- |
| `toTree(data, accessors)` | любой формат (вложенный или плоский) → дерево с `id` и `depth` |
| `fromLevels(levels)` | дерево из уровней, когда связи заданы позицией, а не ссылками |
| `applyCollapsed(roots, ids)` | убирает детей свёрнутых узлов, не меняя исходные данные |
| `layoutTree(roots, options)` | координаты узлов и линии |
| `buildPath(from, to, style, direction)` | SVG-путь: `elbow`, `curve`, `straight` |
| `fitToViewport` / `zoomAtPoint` / `panBy` | математика зума и перетаскивания |
| `PanZoomController` | перетаскивание и зум на голом DOM (мышь + тач) |

Все функции чистые и покрыты тестами — работают и в браузере, и на сервере.

Компоненты поверх этого пакета: [`@dadashi44/tree-view`](https://www.npmjs.com/package/@dadashi44/tree-view) (Vue 3),
[`@dadashi44/tree-view-vue2`](https://www.npmjs.com/package/@dadashi44/tree-view-vue2) (Vue 2).

MIT
