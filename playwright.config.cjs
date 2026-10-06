const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: 'reader.spec.cjs', workers: 1, timeout: 90000,
  outputDir: join(tmpdir(), 'emd-test-results'), reporter: 'line',
});
