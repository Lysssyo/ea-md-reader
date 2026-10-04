const { homedir } = require('node:os');
const { join } = require('node:path');
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: 'reader.spec.cjs', workers: 1, timeout: 90000,
  outputDir: join(homedir(), '.pi/work/emd-test-results'), reporter: 'line',
});
