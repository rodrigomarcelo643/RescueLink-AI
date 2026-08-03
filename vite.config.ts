import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isWidget = mode === 'widget'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    ...(isWidget && {
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/widget/index.tsx'),
          name: 'RescueLinkWidget',
          fileName: 'widget',
          formats: ['iife'],
        },
        rollupOptions: {
          // Bundle everything — widget must be self-contained
          external: [],
        },
        outDir: 'dist-widget',
        emptyOutDir: true,
      },
    }),
  }
})
