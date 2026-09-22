/**
 * Все типы библиотеки живут здесь, чтобы их было легко найти.
 * Ни один файл в core не зависит от Vue — это чистый TypeScript.
 */

/** Куда растёт дерево: корень сверху / снизу / слева / справа. */
export type Direction =
  | 'top-to-bottom'
  | 'bottom-to-top'
  | 'left-to-right'
  | 'right-to-left'

/** Форма соединительной линии между родителем и ребёнком. */
export type LinkStyle = 'straight' | 'elbow' | 'curve'

/**
 * Размер карточки: одно число на все узлы или функция от узла.
 *
 * Функция нужна, когда карточки разной высоты — например, в сетке
 * у финала одна строка, а у остальных матчей две.
 */
export type NodeSize<T> = number | ((node: TreeNode<T>) => number)

/** Настройки раскладки. Все размеры — в пикселях. */
export interface TreeViewOptions<T = any> {
  /** Ширина карточки узла. */
  nodeWidth: NodeSize<T>
  /** Высота карточки узла. */
  nodeHeight: NodeSize<T>
  /** Пустое место между уровнями (между родителем и детьми). */
  levelGap: number
  /** Пустое место между соседними узлами одного уровня. */
  siblingGap: number
  /** Направление роста дерева. */
  direction: Direction
  /** Форма линий. */
  linkStyle: LinkStyle
}

/**
 * Узел дерева после нормализации входных данных.
 * Ссылки на родителя тут нет специально — только `parentId`,
 * иначе объект становится циклическим и его нельзя ни сравнить, ни залогировать.
 */
export interface TreeNode<T> {
  /** Стабильный идентификатор. Используется как ключ во `v-for`. */
  id: string
  /** Исходный объект пользователя — его и отдаём в слот. */
  data: T
  /** 0 у корня, 1 у его детей и так далее. */
  depth: number
  /** Идентификатор родителя или `null` у корня. */
  parentId: string | null
  /** Дети, участвующие в раскладке (у свёрнутого узла — пустой массив). */
  children: TreeNode<T>[]
  /** Были ли дети в исходных данных (остаётся `true`, даже если узел свёрнут). */
  hasChildren: boolean
  /** Свёрнут ли узел. */
  collapsed: boolean
}

/** Узел с посчитанными координатами. `x`/`y` — левый верхний угол карточки. */
export interface LayoutNode<T> {
  id: string
  data: T
  depth: number
  parentId: string | null
  x: number
  y: number
  width: number
  height: number
  hasChildren: boolean
  collapsed: boolean
}

/** Линия между двумя узлами вместе с готовым атрибутом `d` для `<path>`. */
export interface LayoutLink<T> {
  /** Ключ для `v-for`: `"<id родителя>-><id ребёнка>"`. */
  id: string
  source: LayoutNode<T>
  target: LayoutNode<T>
  /** Значение атрибута `d` SVG-пути. */
  path: string
}

/** Результат раскладки: что рисовать и какого размера получился холст. */
export interface Layout<T> {
  nodes: LayoutNode<T>[]
  links: LayoutLink<T>[]
  /** Ширина содержимого в пикселях. */
  width: number
  /** Высота содержимого в пикселях. */
  height: number
}

/** Точка на плоскости. */
export interface Point {
  x: number
  y: number
}

/** Размер прямоугольника. */
export interface Size {
  width: number
  height: number
}

/** Сдвиг и масштаб холста (панорамирование + зум). */
export interface Transform {
  x: number
  y: number
  scale: number
}
