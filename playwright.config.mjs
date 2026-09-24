import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/server.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
  reporter: 'list',
});
