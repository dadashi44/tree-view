import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

/**
 * Во время разработки и тестов core берётся прямо из исходников соседнего пакета,
 * чтобы не пересобирать его после каждой правки.
 * В сборке (command === 'build') алиас НЕ применяется: core остаётся обычной
 * внешней зависимостью, иначе в .d.ts попадут пути с диска разработчика.
 */
const coreSource = fileURLToPath(new URL('../core/src/index.ts', import.meta.url))
const coreStyles = fileURLToPath(new URL('../core/styles.css', import.meta.url))

/**
 * Алиасы заданы регулярками: строковый алиас перехватил бы и
 * «@dadashi44/tree-view-core/style.css?inline», а он должен вести в файл стилей.
 */
const devAliases = [
  { find: /^@dadashi44\/tree-view-core\/style\.css/, replacement: coreStyles },
  { find: /^@dadashi44\/tree-view-core$/, replacement: coreSource },
]

export default defineConfig(({ command }) => ({
  resolve: {
    alias: command === 'serve' ? devAliases : [],
  },
  plugins: [vue(), dts({ include: ['src'] })],
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
      external: ['vue', '@dadashi44/tree-view-core'],
      output: { globals: { vue: 'Vue' } },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
}))
