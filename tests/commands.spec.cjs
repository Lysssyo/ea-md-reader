const { test, expect } = require('@playwright/test');
const { launch, close } = require('./electron-fixture.cjs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const platformArgs = process.platform === 'linux' ? ['--ozone-platform=x11'] : [];

test('真实键盘、按钮和原生菜单共用命令，查找输入保留复制粘贴', async () => {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'emd-commands-')));
  let application, clipboard;
  const errors = [];
  try {
    const files = ['一.md', '二.md', '三.md'].map((name) => path.join(directory, name));
    await Promise.all(files.map((file, index) => fs.writeFile(file, `# 文档${index + 1}\n\n查找文本。\n`)));
    application = await launch({ args: [path.resolve('.'), ...platformArgs, `--user-data-dir=${path.join(directory, 'profile')}`, ...files] });
    const page = await application.firstWindow();
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.getByRole('tab')).toHaveCount(3);
    const primary = process.platform === 'darwin' ? 'meta' : 'control';
    const hint = process.platform === 'darwin' ? 'Cmd' : 'Ctrl';
    async function key(keyCode, modifiers = []) {
      await application.evaluate(({ BrowserWindow }, { keyCode, modifiers }) => {
        const contents = BrowserWindow.getAllWindows()[0].webContents;
        contents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
        contents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
      }, { keyCode, modifiers });
    }
    await expect(page.getByRole('button', { name: '打开文件', exact: true })).toHaveAttribute('title', `打开文件 · ${hint}+O`);
    await application.evaluate(({ dialog }) => {
      global.openCount = 0;
      dialog.showOpenDialog = async () => { global.openCount++; return { canceled: true, filePaths: [] }; };
    });
    await application.evaluate(({ BrowserWindow }) => {
      global.commandInputs = [];
      BrowserWindow.getAllWindows()[0].webContents.on('before-input-event', (_event, input) => {
        if (input.type === 'keyDown') global.commandInputs.push(input);
      });
    });
    await key('O', [primary, 'shift']);
    await key('O', [primary, 'alt']);
    expect(await application.evaluate(() => global.openCount)).toBe(0);
    await key('O', [primary]);
    await expect.poll(() => application.evaluate(() => global.openCount)).toBe(1);
    await page.getByRole('button', { name: '打开文件', exact: true }).click();
    await expect.poll(() => application.evaluate(() => global.openCount)).toBe(2);
    if (process.platform === 'darwin') {
      expect(await application.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('openDocument').accelerator)).toBe('Command+O');
      await application.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('openDocument').click());
      await expect.poll(() => application.evaluate(() => global.openCount)).toBe(3);
      await key('O', [primary]);
      await expect.poll(() => application.evaluate(() => global.openCount)).toBe(4);
    }
    await key('Tab', ['control']);
    await expect(page.getByRole('tab', { selected: true })).toContainText('一.md');
    await key('Tab', ['control', 'shift']);
    await expect(page.getByRole('tab', { selected: true })).toContainText('三.md');
    await key('F', [primary]);
    const search = page.getByRole('textbox', { name: '查找内容' });
    await expect(search).toBeFocused();
    await page.getByRole('button', { name: '打开文件', exact: true }).focus();
    await key('F', [primary]);
    await expect(search).toBeFocused();
    clipboard = await application.evaluate(({ clipboard }) => clipboard.readText());
    await search.fill('原生复制');
    await key('A', [primary]);
    await key('C', [primary]);
    await expect.poll(() => application.evaluate(({ clipboard }) => clipboard.readText())).toBe('原生复制');
    await search.fill('');
    await key('V', [primary]);
    await expect(search).toHaveValue('原生复制');
    await page.getByRole('button', { name: '关闭查找' }).click();
    const zoom = () => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getZoomLevel());
    await key('+', [primary, 'shift']);
    await expect.poll(zoom).toBe(0.5);
    await key('numadd', [primary]);
    const keypad = await application.evaluate(() => global.commandInputs.at(-1));
    expect([keypad.key, keypad.code]).toEqual(['+', 'NumpadAdd']);
    await expect.poll(zoom).toBe(1);
    await key('0', [primary]);
    await expect.poll(zoom).toBe(0);
    await key('-', [primary, 'shift']);
    expect(await zoom()).toBe(0);
    await key('numsub', [primary]);
    await expect.poll(zoom).toBe(-0.5);
    await key('0', [primary]);
    await expect.poll(zoom).toBe(0);
    await key('F', ['alt']);
    await expect(page.getByRole('menuitem', { name: '另存为…' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '另存为…' }).locator('kbd')).toHaveText(`${hint}+Shift+S`);
    await page.getByRole('menuitem', { name: '关闭标签页' }).click();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await key('W', [primary, 'shift']);
    expect(await page.getByRole('tab').count()).toBe(2);
    await key('W', [primary]);
    await expect(page.getByRole('tab')).toHaveCount(1);
    await page.getByRole('tab').click({ button: 'middle' });
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '打开 Markdown / HTML' }).locator('span')).toHaveText(`${hint}+O`);
    if (process.platform === 'darwin') await expect.poll(() => application.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('saveAs').enabled)).toBe(false);
    await key('F', [primary]);
    await expect(search).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    if (application) {
      if (clipboard !== undefined) await application.evaluate(({ clipboard }, original) => clipboard.writeText(original), clipboard);
      await close(application);
    }
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('全屏使用本平台绑定，工作区祖先由主进程返回', async () => {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'emd-command-path-')));
  let application;
  try {
    const entry = path.join(directory, '入口.md');
    const nested = path.join(directory, '章节', '正文.md');
    await fs.mkdir(path.dirname(nested));
    await fs.writeFile(entry, '# 入口\n');
    await fs.writeFile(nested, '# 正文\n');
    application = await launch({ args: [path.resolve('.'), ...platformArgs, `--user-data-dir=${path.join(directory, 'profile')}`, entry, nested] });
    const page = await application.firstWindow();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await page.getByRole('tab').first().click();
    await expect(page.locator('.workspace-root')).toHaveAttribute('title', directory);
    await page.getByRole('tab').last().click();
    await expect(page.locator('.workspace-root')).toHaveAttribute('title', directory);
    await expect(page.getByRole('treeitem', { name: '章节', exact: true })).toHaveAttribute('aria-expanded', 'true');
    const context = await page.evaluate(async () => {
      const id = document.querySelector('[role=tab][aria-selected=true]').id.slice(4);
      return window.emd.workspace(id, document.querySelector('.workspace-root').title);
    });
    expect(context.activeAncestors).toEqual([path.dirname(nested), directory]);
    await application.evaluate(({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents;
      const keyCode = process.platform === 'darwin' ? 'F' : 'F11';
      const modifiers = process.platform === 'darwin' ? ['control', 'meta'] : [];
      contents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
      contents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
    });
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(true);
    await page.evaluate(() => window.emd.command('toggleFullscreen'));
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);
  } finally {
    if (application) await close(application);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
