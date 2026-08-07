/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  base: '/riverbed/',
  build: {
    rollupOptions: {
      // Two pages: the essay at the root and the standalone simulator under
      // /play/. Vite only picks up the root index.html by default, so every
      // other page needs listing here explicitly.
      input: {
        main: resolve(root, 'index.html'),
        play: resolve(root, 'play/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
