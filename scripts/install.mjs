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
const icon = join(data, 'icons/hicolor/scalable/apps/emd.svg');
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

if (process.argv.includes('--uninstall')) {
  for (const file of [target, desktop, icon, join(bin, 'emd')]) await rm(file, { force: true, recursive: true });
  execFileSync('update-desktop-database', [join(data, 'applications')]);
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
  await writeFile(desktop, template.replace('Exec=emd %F', `Exec=${desktopExecutable} %F`).replace('TryExec=emd', `TryExec=${join(bin, 'emd')}`));
  await cp(join(root, 'assets/emd.svg'), icon);
  execFileSync('desktop-file-validate', [desktop]);
  execFileSync('update-desktop-database', [join(data, 'applications')]);
  console.log(`已安装 emd：${join(bin, 'emd')}\n桌面 / Dolphin 入口：${desktop}`);
}
