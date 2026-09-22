import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** Играем прямо с исходниками пакетов — правки видны сразу, без сборки. */
const resolveSource = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Алиасы регулярками, а не строками: строка перехватила бы и
    // «@bigplay/tree-view-core/style.css?inline», который должен вести в файл стилей.
    alias: [
      { find: /^@bigplay\/tree-view-core\/style\.css/, replacement: resolveSource('../packages/core/styles.css') },
      { find: /^@bigplay\/tree-view-core$/, replacement: resolveSource('../packages/core/src/index.ts') },
      { find: /^@bigplay\/tree-view$/, replacement: resolveSource('../packages/vue3/src/index.ts') },
    ],
  },
})
