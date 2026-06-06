import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true, // describe/it/expect global, không cần import
    environment: 'jsdom', // DOM cho React Testing Library
    setupFiles: ['./src/test/setup.ts'],
    css: false, // skip CSS processing trong test
  },
})
