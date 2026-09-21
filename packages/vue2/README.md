# @dadashi/tree-view-vue2

Дерево и турнирные сетки для Vue 2.6 / 2.7. Тот же компонент, что и
[`@dadashi/tree-view`](https://www.npmjs.com/package/@dadashi/tree-view) для Vue 3:
общий core, одинаковые пропы, события и классы стилей.

```bash
npm i @dadashi/tree-view-vue2
```

```js
import Vue from 'vue'
import { TreeView } from '@dadashi/tree-view-vue2'

Vue.component('TreeView', TreeView)
```

```html
<tree-view :data="data" :options="{ direction: 'right-to-left' }" collapsible>
  <template #node="{ data, toggle }">
    <div class="my-card" @click="toggle">{{ data.name }}</div>
  </template>
</tree-view>
```

Стили подключать не нужно — они внутри пакета и вставляются сами.

Полная документация — в [корневом README](https://github.com/dadashi44/tree-view#readme).

MIT
