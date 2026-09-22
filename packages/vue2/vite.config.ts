import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

/** В dev/тестах берём core из исходников, в сборке — как внешнюю зависимость. */
const coreSource = fileURLToPath(new URL('../core/src/index.ts', import.meta.url))
const coreStyles = fileURLToPath(new URL('../core/styles.css', import.meta.url))

/**
 * Алиасы заданы регулярками: строковый алиас перехватил бы и
 * «@bigplay/tree-view-core/style.css?inline», а он должен вести в файл стилей.
 */
const devAliases = [
  { find: /^@bigplay\/tree-view-core\/style\.css/, replacement: coreStyles },
  { find: /^@bigplay\/tree-view-core$/, replacement: coreSource },
]

export default defineConfig(({ command }) => ({
  resolve: {
    alias: command === 'serve' ? devAliases : [],
  },
  plugins: [dts({ include: ['src'] })],
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      // Иначе CSS назовётся по имени пакета и путь в exports перестанет совпадать.
      cssFileName: 'style',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', '@bigplay/tree-view-core'],
      output: { globals: { vue: 'Vue' } },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
}))
