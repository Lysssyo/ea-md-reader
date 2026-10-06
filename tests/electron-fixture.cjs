const { test, _electron: electron } = require('@playwright/test');
const { appendFileSync } = require('node:fs');

async function launch(options) {
  const application = await electron.launch({ chromiumSandbox: true, ...options });
  const log = test.info().outputPath('electron-process.log');
  for (const stream of [application.process().stdout, application.process().stderr]) {
    stream.on('data', (chunk) => appendFileSync(log, chunk));
  }
  await application.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
  return application;
}

async function close(application) {
  try {
    await application.context().tracing.stop({ path: test.info().outputPath('electron-context-trace.zip') });
  } finally {
    await application.close();
  }
}

module.exports = { launch, close };
