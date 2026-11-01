import { defineConfig } from 'vitest/config'
import path from 'path'

// ============================================================
// Vitest Configuration
//
// Tests unitaires pour les lib/ (auth, teams, mcp-tools, etc.)
// Exécuter : npm test
// UI : npm run test:ui
// ============================================================

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules/', 'tests/e2e/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/db.ts', 'src/lib/sentry.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
