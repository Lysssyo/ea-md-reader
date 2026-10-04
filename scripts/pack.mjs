import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlatformArgs, selectPlatform } from './platforms.mjs';

async function main() {
  const { platform: requested, rest } = parsePlatformArgs(process.argv.slice(2));
  if (rest.length) throw new Error('用法：npm run pack -- [--platform=kde|gnome|mac|windows]');
  const platform = selectPlatform(requested);
  const adapter = await platform.load();
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('请通过 npm run pack 调用打包入口。');
  console.log(`打包平台：${platform.name}`);
  execFileSync(process.execPath, [npmCli, 'run', 'build'], { cwd: root, stdio: 'inherit' });
  const { build } = await import('electron-builder');
  await build({ projectDir: root, ...adapter.packOptions, publish: 'never' });
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
