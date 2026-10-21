/**
 * End-to-end tests against the real API, website and admin panel.
 *   npm run build && npm run test:e2e
 * The API runs on an in-memory MongoDB with demo data (e2e/api-server.mjs).
 */
import { defineConfig, devices } from '@playwright/test';

const reuse = !process.env.CI;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: '../playwright-report' }]]
    : [['list']],
  outputDir: '../test-results',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-GB',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: '**/public.spec.js' },
  ],
  webServer: [
    {
      command: 'node e2e/api-server.mjs',
      cwd: '..',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: reuse,
      timeout: 120_000,
    },
    {
      command: 'node e2e/start-web.mjs',
      cwd: '..',
      url: 'http://localhost:3000',
      reuseExistingServer: reuse,
      timeout: 120_000,
    },
    {
      command: 'npm run preview --workspace @ghotok/admin -- --port 5173 --strictPort',
      cwd: '..',
      url: 'http://localhost:5173',
      reuseExistingServer: reuse,
      timeout: 120_000,
    },
  ],
});
