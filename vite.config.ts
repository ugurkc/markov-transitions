/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/markov-transitions/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
