// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './jules-scratch',
  timeout: 60000,
  reporter: 'html',

  projects: [
    // Setup project
    { name: 'setup', testMatch: /setup\.spec\.js/ },

    // Test project
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state.
        storageState: 'storageState.json',
      },
      dependencies: ['setup'],
      testMatch: /final_verification\.spec\.js/,
    },
  ],
});
