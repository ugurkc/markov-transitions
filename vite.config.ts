/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  base: '/watershed/',
  build: {
    rollupOptions: {
      // Two independent pages: the blog landing/directory at the site root,
      // and the Watershed essay under its own sub-path. Vite only picks up
      // the root index.html by default, so every other page needs listing
      // here explicitly.
      input: {
        main: resolve(root, 'index.html'),
        watershed: resolve(root, 'essays/watershed/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
