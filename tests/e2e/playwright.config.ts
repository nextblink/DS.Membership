import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5185',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command:
        'dotnet run --project ../../src/backend/Marsipan.Membership.Web --launch-profile https',
      url: 'https://localhost:7231/health',
      reuseExistingServer: !isCI,
      ignoreHTTPSErrors: true,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm --prefix ../../src/client/MembershipAdmin run dev',
      url: 'http://localhost:5185',
      reuseExistingServer: !isCI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
