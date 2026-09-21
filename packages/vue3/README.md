# @dadashi/tree-view

Дерево и турнирные сетки для Vue 3. Без зависимостей (d3 не нужен).

```bash
npm i @dadashi/tree-view
```

```vue
<script setup>
import { TreeView } from '@dadashi/tree-view'

const data = { id: 'final', name: 'Финал', children: [{ id: 'sf-1', name: 'Полуфинал' }] }
</script>

<template>
  <div style="height: 600px">
    <TreeView :data="data" :options="{ direction: 'right-to-left' }" collapsible />
  </div>
</template>
```

Свой вид узла — через слот:

```vue
<TreeView :data="data">
  <template #node="{ data, collapsed, hasChildren, toggle }">
    <div class="my-card" @click="toggle">{{ data.name }}</div>
  </template>
</TreeView>
```

Стили подключать не нужно — они внутри пакета и вставляются сами.

Полная документация — в [корневом README](https://github.com/dadashi44/tree-view#readme):
пропы, события, методы, форматы данных, CSS-переменные.

MIT
