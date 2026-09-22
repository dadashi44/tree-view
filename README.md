# 🌳 tree-view

Дерево и турнирные сетки для Vue 2, Vue 3 и Nuxt.
Вся математика — в отдельном пакете без зависимостей; компоненты только рисуют.

```
packages/
  core   — @bigplay/tree-view-core        чистый TypeScript: раскладка, линии, зум. Ни строчки Vue
  vue3   — @bigplay/tree-view             компонент для Vue 3
  vue2   — @bigplay/tree-view-vue2        компонент для Vue 2.6 / 2.7
  nuxt   — @bigplay/tree-view-nuxt        модуль Nuxt 3 / 4
playground — песочница на Vite: три типа сеток с данными и вёрсткой из clientFrontend
```

Зависимостей нет вообще: d3 не нужен, раскладка — своя (≈100 строк).

---

## Установка

```bash
# Vue 3
npm i @bigplay/tree-view

# Vue 2.6 / 2.7
npm i @bigplay/tree-view-vue2

# Nuxt 3 / 4
npm i @bigplay/tree-view-nuxt
```

## Быстрый старт

### Vue 3

```vue
<script setup>
import { TreeView } from '@bigplay/tree-view'

const data = {
  id: 'final',
  name: 'Финал',
  children: [
    { id: 'sf-1', name: 'Полуфинал 1' },
    { id: 'sf-2', name: 'Полуфинал 2' },
  ],
}
</script>

<template>
  <!-- контейнер должен иметь высоту: дерево занимает 100% родителя -->
  <div style="height: 600px">
    <TreeView :data="data" :options="{ direction: 'right-to-left' }" />
  </div>
</template>
```

### Vue 2

```js
import Vue from 'vue'
import { TreeView } from '@bigplay/tree-view-vue2'

Vue.component('TreeView', TreeView)
```

```html
<tree-view :data="data" :options="{ direction: 'right-to-left' }" />
```

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@bigplay/tree-view-nuxt'],
})
```

Компоненты регистрируются глобально:

```vue
<TreeView :data="data" />
```

---

Стили подключать не нужно: они лежат внутри пакета и вставляются в страницу сами
при первом импорте (на сервере при SSR — ничего не делают, на клиенте появляются при гидрации).
Если стили нужны файлом (например, для critical CSS), он есть:
`@bigplay/tree-view-core/style.css`.

## Свой внешний вид узла

Главный способ кастомизации — слот `#node`. В него приходит всё, что нужно:

```vue
<TreeView :data="bracket" :options="{ nodeWidth: 200, nodeHeight: 70 }">
  <template #node="{ data, depth, collapsed, hasChildren, toggle }">
    <div class="match" @dblclick="toggle">
      <div v-for="team in data.teams" :key="team.name" :class="{ winner: team.isWinner }">
        {{ team.name }} — {{ team.score }}
      </div>
    </div>
  </template>
</TreeView>
```

| Что приходит в слот | Что это |
| --- | --- |
| `data` | ваш исходный объект узла, без изменений |
| `node` | узел с координатами: `id`, `x`, `y`, `width`, `height`, `depth` |
| `depth` | уровень: 0 — корень |
| `collapsed` | свёрнут ли узел |
| `hasChildren` | есть ли у него дети |
| `toggle` | функция: свернуть/развернуть этот узел |

Во Vue 2 то же самое через `<template #node="props">`.

### Готовая карточка матча

Если нужна обычная карточка турнирной сетки — она уже есть в пакете
(и в Vue 3, и в Vue 2), копировать вёрстку по проектам не нужно:

```vue
<script setup>
import { BracketCard, TreeView, bracketCardHeight } from '@bigplay/tree-view'

const isFinal = (match) => match.nextId == null

const options = {
  nodeWidth: 211,
  nodeHeight: (node) => bracketCardHeight(node.data, { rows: isFinal(node.data) ? 1 : 2 }),
  direction: 'right-to-left',
}
</script>

<template>
  <TreeView :data="matches" :options="options" :get-parent-id="(m) => m.nextId">
    <template #node="{ data: match }">
      <BracketCard :match="match" :rows="isFinal(match) ? 1 : 2" @select="openMatch" />
    </template>
  </TreeView>
</template>
```

Карточке нужно одно поле — `teams`, каждая команда: `name`, `score`, `isWinner`,
`isTechDefeat`, `isMyTeam`. Победитель синий, проигравший серый, «моя команда»
в рамке с подсказкой, техническое поражение показывает «ТП» и объяснение по наведению.

| Проп | По умолчанию | Описание |
| --- | --- | --- |
| `match` | — | объект с полем `teams` |
| `rows` | `2` | сколько строк рисовать; команд больше — покажем всех |
| `myTeamHint` | `'Нажми для перехода в матч 👇'` | подпись над карточкой; `''` — убрать |
| `techDefeatLabel` | `'ТП'` | что писать вместо счёта |
| `techDefeatHint` | `'Техническое поражение'` | подсказка по наведению |

Событие `select` отдаёт команду, по которой кликнули. Цвета меняются переменными
`--tv-bracket-winner-bg`, `--tv-bracket-loser-bg`, `--tv-bracket-my-bg` и другими.

Без Vue то же самое доступно функцией `buildBracketCard(match, { rows })` из core —
она возвращает готовый список строк.

Ещё три способа настроить внешний вид:

1. **CSS-переменные** — быстрый способ поменять цвета, не трогая разметку:

   ```css
   .tree-view {
     --tv-link-color: #94a3b8;
     --tv-link-width: 3px;
     --tv-node-bg: #0f172a;
     --tv-node-color: #f8fafc;
     --tv-node-radius: 14px;
   }
   ```

2. **`node-class`** — свой класс на обёртку узла, строкой или функцией:

   ```vue
   <TreeView :data="data" :node-class="(node) => node.depth === 0 ? 'is-final' : ''" />
   ```

3. **Слот `#link`** — если нужны свои линии (пунктир, стрелки, подписи):

   ```vue
   <template #link="{ link }">
     <path :d="link.path" stroke="#f00" stroke-dasharray="4 4" fill="none" />
   </template>
   ```

Элементы внутри узла, которые не должны начинать перетаскивание холста
(кнопки, инпуты, ссылки), помечайте атрибутом `data-tv-no-pan`.

Ещё одна мелочь, о которую легко споткнуться: линии приходят **в середину бокса узла**
(его размер задают `nodeWidth` и `nodeHeight`). Поэтому содержимое слота стоит растягивать
на всю высоту (`height: 100%`), а если строк внутри меньше, чем обычно — центрировать их
(`justify-content: center`). Иначе карточка будет выглядеть съехавшей относительно линии:
так бывает у финала, где рисуется одна ячейка победителя вместо двух.

---

## Форматы данных

Библиотека не требует приводить данные к своей структуре — она читает их аксессорами.

**Вложенный** (по умолчанию `id` + `children`):

```vue
<TreeView :data="{ id: 1, children: [{ id: 2 }] }" />
```

**Свои названия полей:**

```vue
<TreeView
  :data="matches"
  :get-id="(item) => item.matchId"
  :get-children="(item) => item.nextMatches"
/>
```

**Плоский список** — включается передачей `get-parent-id`:

```vue
<TreeView
  :data="[
    { matchId: 'final', parentId: null },
    { matchId: 'sf-1', parentId: 'final' },
  ]"
  :get-id="(item) => item.matchId"
  :get-parent-id="(item) => item.parentId"
/>
```

**Уровнями, без ссылок на родителя** — когда связи заданы только позицией
(так устроены bounty-сетки: пары групп раунда сходятся в группу следующего):

```ts
import { fromLevels, flatten } from '@bigplay/tree-view-core'

// уровни от первого раунда к финалу
const roots = fromLevels([round1.groups, round2.groups, final.groups])

// дальше это обычный плоский список для компонента
const nodes = flatten(roots).map((node) => ({ ...node.data, id: node.id, parentId: node.parentId }))
```

Несколько корней (несколько деревьев рядом) поддерживаются — просто передайте массив.
Если `id` нет вовсе, он берётся из пути в дереве (`"0.1.2"`) и остаётся стабильным между перерисовками.

---

## Пропы

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `data` | объект / массив | — | данные дерева |
| `options` | объект | см. ниже | размеры и направление, можно передать часть полей |
| `getId` | функция | `item.id` | как достать идентификатор |
| `getChildren` | функция | `item.children` | как достать детей |
| `getParentId` | функция | — | передан → данные считаются плоским списком |
| `collapsible` | boolean | `false` | клик по узлу сворачивает ветку |
| `pannable` | boolean | `true` | перетаскивание мышью и пальцем |
| `zoomable` | boolean | `true` | зум колесом и «щипком» |
| `fitOnMount` | boolean | `true` | вписать дерево при первом показе |
| `size` | `'fill'` / `'content'` | `'fill'` | `fill` — занять родителя и обрезать лишнее; `content` — принять размер дерева и ничего не обрезать |
| `scaleLimits` | `{ min, max }` | `{ 0.2, 3 }` | пределы масштаба |
| `nodeClass` | строка / функция | — | доп. класс на обёртку узла |
| `virtualize` | boolean | `true` | рисовать только то, что видно на экране (см. «Большие сетки») |
| `overscan` | число | `400` | запас в пикселях вокруг видимой области |

`options` и значения по умолчанию:

```ts
{
  nodeWidth: 180,          // ширина карточки: число или функция от узла
  nodeHeight: 64,          // высота карточки: число или функция от узла
  levelGap: 60,            // расстояние между уровнями
  siblingGap: 16,          // расстояние между соседями
  direction: 'top-to-bottom',  // top-to-bottom | bottom-to-top | left-to-right | right-to-left
  linkStyle: 'elbow',          // elbow | curve | straight
}
```

### Карточки разного размера

`nodeWidth` и `nodeHeight` принимают функцию от узла — тогда каждая карточка
занимает ровно своё место, а соседи расступаются:

```ts
const options = {
  nodeWidth: 211,
  // у финала один победитель, у остальных матчей две строки
  nodeHeight: (node) => (node.data.nextId == null ? 40 : 80),
}
```

Что при этом происходит:

- сосед начинается там, где кончилась предыдущая карточка, а не «через шаг сетки»;
- уровень занимает столько, сколько его самая крупная карточка, а карточки поменьше
  стоят по центру полосы;
- линия по-прежнему приходит в середину боковой грани карточки — значит,
  центрировать содержимое слота вручную больше не нужно.

Если размеры одинаковые, раскладка считается ровно так же, как раньше.

### Как сетка занимает место

По умолчанию (`size="fill"`) компонент растягивается на родителя, лишнее обрезается,
а дерево двигают мышью или пальцем — так удобно для больших сеток в отдельном экране.

Если сетка стоит внутри обычной страницы со своим скроллом (как на странице турнира),
включите `size="content"` — контейнер примет размер дерева и ничего не обрежет:

```vue
<div style="overflow-x: auto">
  <TreeView :data="data" size="content" :pannable="false" :zoomable="false" />
</div>
```

## Большие сетки

Тысяча матчей — нормальный размер, библиотека к нему готова. Считает раскладку
она быстро, дорогой здесь только DOM, поэтому по умолчанию рисуется лишь то,
что видно на экране (`virtualize`), а при скролле список карточек пересобирается.

Замеры в Chrome на MacBook, сетка в обычном скролле страницы (`size="content"`):

| Матчей | Элементов в DOM | Отрисовка | Без виртуализации |
| --- | --- | --- | --- |
| 255 | 286 | 4 мс | 10 мс / 2 299 элементов |
| 1023 | 286 | 2 мс | 44 мс / 9 219 элементов |
| 4095 | 295 | 4 мс | 161 мс / 36 899 элементов |

Сама математика в core на этом фоне незаметна: 1023 матча — `toTree` 0.2 мс
и `layoutTree` 0.3 мс, 16 тысяч — 2.6 мс и 5.9 мс.

Что стоит знать:

- размер холста и полоса прокрутки всегда считаются по всему дереву, а не по видимой
  части — страница не «прыгает» при скролле, а `fit()` вписывает сетку целиком;
- `overscan` (по умолчанию 400px) — запас вокруг экрана, чтобы карточки не появлялись
  ровно на границе; на медленных машинах его можно уменьшить, на быстрых — увеличить;
- на дереве меньше 150 узлов фильтр не включается: дешевле нарисовать всё;
- при SSR виртуализация выключена (экрана ещё нет) — сервер отдаёт дерево целиком,
  а в браузере лишнее убирается на первом же кадре;
- выключить совсем: `:virtualize="false"`.

Что остаётся дорогим независимо от библиотеки: если в каждой карточке свои картинки,
тултипы и обработчики, тысяча таких карточек всё равно займёт память — виртуализация
помогает именно тем, что в один момент их существует несколько десятков.

---

## События

| Событие | Аргументы |
| --- | --- |
| `node-click` | `(node, event)` |
| `toggle` | `(node, collapsed)` |
| `transform` | `({ x, y, scale })` |

## Методы (через `ref`)

```vue
<TreeView ref="tree" :data="data" />
```

`tree.fit()` · `tree.zoomIn()` · `tree.zoomOut()` · `tree.resetTransform()` ·
`tree.setTransform({ x, y, scale })` · `tree.toggle(id)` · `tree.expandAll()`

---

## Core отдельно

Если Vue не нужен — считать раскладку можно напрямую:

```ts
import { toTree, layoutTree } from '@bigplay/tree-view-core'

const layout = layoutTree(toTree(data), { direction: 'right-to-left' })
// layout.nodes — координаты карточек, layout.links — готовые SVG-пути, layout.width/height — холст
```

Все функции чистые: одни и те же данные всегда дают один и тот же результат,
поэтому их легко тестировать и использовать на сервере (SSR тоже работает).

---

## Как всё устроено

```
данные пользователя
      │  toTree()          нормализация: любой формат → дерево с id и depth
      ▼
   TreeNode[]
      │  applyCollapsed()  убирает детей свёрнутых узлов (копией, без мутаций)
      ▼
   TreeNode[]
      │  layoutTree()      координаты: листья по порядку, родитель — по центру детей
      ▼
   Layout { nodes, links, width, height }
      │  visibleLayout()   оставляет узлы и линии, попадающие на экран
      ▼
   компонент Vue рисует div'ы поверх SVG
```

Принципы, которых придерживаемся:

- **core ничего не знает о Vue.** Поэтому Vue 2 и Vue 3 адаптеры — тонкие (по ~200 строк)
  и не дублируют логику, а зум и перетаскивание живут в `PanZoomController` на голом DOM.
- **Ничего не мутируем.** Данные пользователя библиотека только читает.
- **Одна функция — одна задача.** `normalize` / `layout` / `links` / `viewport` / `collapse`
  можно читать и тестировать по отдельности.
- **Никакой магии в CSS.** Ни одного `!important`, все цвета — переменные.

## Разработка

```bash
npm install          # ставит зависимости всех пакетов (npm workspaces)
npm run dev          # песочница: настоящая турнирная сетка на http://localhost:5173
npm test             # тесты всех пакетов (vitest)
npm run typecheck    # проверка типов
npm run build        # сборка всех пакетов
npm run verify       # всё вместе + проверка упаковки перед публикацией
npm run set-version  # общая версия всем пакетам (см. «Публикация»)
```

История изменений — в [CHANGELOG.md](CHANGELOG.md).

Тесты: 183 штуки — раскладка и нормализация данных в core, поведение компонентов
в vue3 и vue2 (@vue/test-utils + happy-dom).

## Публикация

Версии у всех четырёх пакетов общие, и они ссылаются друг на друга,
поэтому поднимать версию нужно сразу везде:

```bash
npm run set-version 0.2.0   # версия всем пакетам + ссылки между ними
npm install                 # обновить package-lock
npm run verify              # типы, тесты, сборка, проверка упаковки

git commit -am "chore: версия 0.2.0"
git tag v0.2.0
git push && git push --tags
```

Тег запускает workflow `.github/workflows/release.yml`, который сам
проверит и опубликует пакеты **в правильном порядке**:
core → vue3 → vue2 → nuxt (зависимость должна попасть в реестр раньше зависящего).

Для этого в репозитории должен быть секрет `NPM_TOKEN`
(Settings → Secrets and variables → Actions) — npm-токен типа Automation с правом publish.

Если нужно руками, без Actions:

```bash
npm run verify
npm publish --workspace @bigplay/tree-view-core
npm publish --workspace @bigplay/tree-view
npm publish --workspace @bigplay/tree-view-vue2
npm publish --workspace @bigplay/tree-view-nuxt
```

`npm run check:packaging` проверяет, что все пути из `package.json` существуют в `dist` —
это защита от классической ошибки, когда `main` указывает на несуществующий файл.

## Лицензия

MIT
