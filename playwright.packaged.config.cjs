const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: 'packaged-*.spec.cjs', workers: 1, timeout: 90000,
  outputDir: 'test-results/packaged', reporter: 'line',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
