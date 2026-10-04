import { cp, mkdir, readFile, rm, writeFile, chmod, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = process.env.XDG_DATA_HOME || join(homedir(), '.local/share');
const state = process.env.XDG_STATE_HOME || join(homedir(), '.local/state');
const bin = join(homedir(), '.local/bin');
const target = join(data, 'emd');
const desktop = join(data, 'applications/io.github.yceachan.emd.desktop');
const iconName = 'io.github.yceachan.emd';
const icon = join(data, `icons/hicolor/scalable/apps/${iconName}.svg`);
const iconSizes = [16, 24, 32, 48, 64, 128, 256, 512];
const rasterIcons = iconSizes.map((size) => join(data, `icons/hicolor/${size}x${size}/apps/${iconName}.png`));
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function refreshDesktopIntegration() {
  execFileSync('update-desktop-database', [join(data, 'applications')]);
  if (process.env.XDG_CURRENT_DESKTOP?.split(':').includes('KDE')) {
    execFileSync('kbuildsycoca6', ['--noincremental']);
  }
}

if (process.argv.includes('--uninstall')) {
  for (const file of [target, desktop, icon, ...rasterIcons, join(bin, 'emd')]) await rm(file, { force: true, recursive: true });
  refreshDesktopIntegration();
  console.log('已移除用户级 emd 安装；配置和日志保留。');
} else {
  const source = process.argv[2] ? resolve(process.argv[2]) : join(root, 'release/linux-unpacked');
  await access(join(source, 'emd'));
  for (const directory of [target, bin, dirname(desktop), dirname(icon), join(state, 'emd')]) await mkdir(directory, { recursive: true });
  await cp(source, target, { recursive: true });
  await chmod(join(target, 'emd'), 0o755);
  // setsid plus redirected stdio detaches the application from the invoking shell.
  const launcher = `#!/bin/sh\nset -eu\nif ! command -v setsid >/dev/null 2>&1; then\n  echo 'emd requires setsid (util-linux).' >&2\n  exit 1\nfi\nmkdir -p ${quote(join(state, 'emd'))}\nsetsid ${quote(join(target, 'emd'))} "$@" </dev/null >>${quote(join(state, 'emd/emd.log'))} 2>&1 &\n`;
  await writeFile(join(bin, 'emd'), launcher, { mode: 0o755 });
  const template = await readFile(join(root, 'assets/emd.desktop'), 'utf8');
  // Desktop Exec escaping follows the freedesktop specification, not shell quoting.
  const desktopExecutable = '"' + join(bin, 'emd').replace(/[\\"`$]/g, '\\$&').replaceAll('%', '%%') + '"';
  await writeFile(desktop, template.replace('Exec=emd %F', `Exec=${desktopExecutable} %F`).replace('TryExec=emd', `TryExec=${join(bin, 'emd')}`).replace('Icon=io.github.yceachan.emd', `Icon=${rasterIcons[iconSizes.indexOf(256)]}`));
  await cp(join(root, 'assets/emd.svg'), icon);
  for (let index = 0; index < iconSizes.length; index++) {
    await mkdir(dirname(rasterIcons[index]), { recursive: true });
    await cp(join(root, `assets/icons/${iconSizes[index]}.png`), rasterIcons[index]);
  }
  // Remove the previous icon name after upgrading to the desktop application ID.
  await rm(join(data, 'icons/hicolor/scalable/apps/emd.svg'), { force: true });
  execFileSync('desktop-file-validate', [desktop]);
  refreshDesktopIntegration();
  console.log(`已安装 emd：${join(bin, 'emd')}\n桌面 / Dolphin 入口：${desktop}`);
}
