import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ include: ['src'] })],
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/module.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'module.js' : 'module.cjs'),
    },
    rollupOptions: {
      external: ['@nuxt/kit', '@bigplay/tree-view', '@bigplay/tree-view-core'],
    },
  },
})
