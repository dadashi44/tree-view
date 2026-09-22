import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** Играем прямо с исходниками пакетов — правки видны сразу, без сборки. */
const resolveSource = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Алиасы регулярками, а не строками: строка перехватила бы и
    // «@dadashi44/tree-view-core/style.css?inline», который должен вести в файл стилей.
    alias: [
      { find: /^@dadashi44\/tree-view-core\/style\.css/, replacement: resolveSource('../packages/core/styles.css') },
      { find: /^@dadashi44\/tree-view-core$/, replacement: resolveSource('../packages/core/src/index.ts') },
      { find: /^@dadashi44\/tree-view$/, replacement: resolveSource('../packages/vue3/src/index.ts') },
    ],
  },
})
