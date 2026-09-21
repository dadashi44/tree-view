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
      external: ['@nuxt/kit', '@dadashi/tree-view', '@dadashi/tree-view-core'],
    },
  },
})
