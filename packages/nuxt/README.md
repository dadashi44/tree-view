# @dadashi44/tree-view-nuxt

Модуль Nuxt 3 / 4: подключает [`@dadashi44/tree-view`](https://www.npmjs.com/package/@dadashi44/tree-view)
одной строкой — компоненты регистрируются глобально, стили тоже подключаются сами.

```bash
npm i @dadashi44/tree-view-nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dadashi44/tree-view-nuxt'],

  // необязательно
  treeView: {
    prefix: '',   // 'App' даст <AppTreeView />
  },
})
```

```vue
<template>
  <div style="height: 600px">
    <TreeView :data="data" />
  </div>
</template>
```

Раскладка считается чистыми функциями, поэтому SSR работает без «прыжков»:
на сервере дерево уже отрисовано, на клиенте добавляются перетаскивание и зум.

MIT
