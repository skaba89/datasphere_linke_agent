import { defineConfig, devices } from '@playwright/test'

// ============================================================
// Playwright config - Tests E2E DataSphere
//
// Usage :
//   npx playwright test              # tous les tests
//   npx playwright test --ui         # mode interactif
//   npx playwright test auth         # tests d'auth uniquement
// ============================================================

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'tests/report' }],
    ['list'],
  ],
  use: {
    // URL de base (Render en prod, localhost en dev)
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:10000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Timeout généreux pour les actions (LLM peut être lent)
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Démarrer le serveur local pour les tests (si pas de PLAYWRIGHT_BASE_URL)
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm start',
        url: 'http://localhost:10000/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
          DATABASE_URL: process.env.TEST_DATABASE_URL || 'file:./test.sqlite',
          DATASPHERE_AUTH_SECRET: 'test-secret-32-chars-min-aaa',
          NODE_ENV: 'production',
          PORT: '10000',
        },
      },
})
