const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

test('渲染、只读、多标签、另存为、重读、第二次启动及相对图片', async () => {
  const directory = await fs.mkdtemp(path.join(os.homedir(), '.pi/work/emd-ui-'));
  const fixture = path.join(directory, '阅读 示例.md');
  const sibling = path.join(directory, '第二页.md');
  const copy = path.join(directory, '副本.md');
  const markdown = '\ufeff---\r\ntitle: 样式检查\r\n---\r\n# 静心阅读\r\n\r\n熟悉的纸色，与清晰的排版。\r\n\r\n## 代码与公式\r\n\r\n```typescript\r\nconst greeting = "你好，emd";\r\n```\r\n\r\n行内公式 $E = mc^2$。\r\n\r\n$$\r\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\r\n$$\r\n\r\n> [!NOTE]\r\n> 原始 Markdown 保持只读。\r\n\r\n- [x] 已完成\r\n- [ ] 待处理\r\n\r\n:::callout 💡\r\n阅读提示\r\n:::\r\n\r\n| 功能 | 状态 |\r\n| --- | --- |\r\n| 多标签 | 支持 |\r\n\r\n## 图表\r\n\r\n```mermaid\r\nflowchart LR\r\n A[Markdown] --> B[emd] --> C[阅读]\r\n```\r\n\r\n![本地插图](<示例 图片.svg>)\r\n\r\n[打开第二页](第二页.md#另一页)\r\n\r\n<script>window.pwned = true</script><img src="bad.png" onerror="window.pwned=true"><iframe src="https://example.com"></iframe>\r\n';
  await fs.writeFile(fixture, markdown);
  await fs.writeFile(sibling, '# 另一页\n\n第二个标签页\n');
  await fs.writeFile(path.join(directory, '示例 图片.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="130"><rect width="500" height="130" rx="12" fill="#f0ebe4"/><text x="30" y="75" fill="#a45d47" font-size="28">emd · Markdown reader</text></svg>');
  const errors = [];
  let application;
  try {
    const launchEnv = { ...process.env, XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache') };
    application = await electron.launch({ args: [path.resolve('.'), '--ozone-platform=x11', `--user-data-dir=${path.join(directory, 'profile')}`, fixture], env: launchEnv });
    const page = await application.firstWindow();
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.locator('.vp-doc h1')).toHaveText('静心阅读');
    const nativeHandle = await application.evaluate(({ BrowserWindow }) => Array.from(BrowserWindow.getAllWindows()[0].getNativeWindowHandle()));
    const windowId = Buffer.from(nativeHandle).readUInt32LE();
    await expect.poll(() => /Icon \(\d+ x \d+\)/.test(execFileSync('xprop', ['-id', String(windowId), '_NET_WM_ICON'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }))).toBe(true);
    await expect(page.locator('.vp-doc pre.shiki span').first()).toBeVisible();
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.locator('.github-alert')).toContainText('原始 Markdown');
    await expect(page.locator('.callout')).toContainText('阅读提示');
    await expect(page.locator('.task-list-item-checkbox').first()).toBeDisabled();
    await expect(page.locator('.task-list-item-checkbox').first()).toBeChecked();
    await expect(page.locator('.mermaid svg')).toBeVisible({ timeout: 60000 });
    await expect.poll(() => page.locator('img[alt="本地插图"]').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => window.pwned)).toBeUndefined();
    expect(await page.evaluate(() => typeof window.require)).toBe('undefined');
    await expect(page.locator('.vp-doc iframe, .vp-doc script')).toHaveCount(0);
    await page.locator('.document-panel').evaluate((panel) => { panel.scrollTop = 0; });
    await expect(page.getByRole('navigation', { name: '本文目录' })).toBeVisible();
    await page.getByRole('button', { name: '折叠 静心阅读', exact: true }).click();
    await expect(page.getByRole('navigation', { name: '本文目录' }).getByRole('button', { name: '代码与公式', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '展开 静心阅读', exact: true }).click();
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(700, 650));
    await expect(page.getByRole('navigation', { name: '本文目录' })).toHaveCount(0);
    await page.getByRole('button', { name: '展开目录面板', exact: true }).click();
    await expect(page.getByRole('navigation', { name: '本文目录' })).toBeVisible();
    await page.getByRole('button', { name: '折叠目录面板', exact: true }).click();
    await expect(page.getByRole('button', { name: '展开目录面板', exact: true })).toBeVisible();
    expect(await page.locator('.app').evaluate((element) => getComputedStyle(element).borderRadius)).toBe('10px');
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1180, 850));
    await page.screenshot({ path: path.join(os.homedir(), '.pi/work/emd-light.png') });
    await expect(page.getByRole('button', { name: '最大化窗口' })).toBeVisible();
    await page.getByRole('button', { name: '最大化窗口' }).click();
    await expect(page.getByRole('button', { name: '还原窗口' })).toBeVisible();
    await page.getByRole('button', { name: '还原窗口' }).click();
    await expect(page.getByRole('button', { name: '最大化窗口' })).toBeVisible();
    expect(await application.evaluate(({ Menu }) => Menu.getApplicationMenu())).toBe(null);
    await application.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }); }, copy);
    await page.getByRole('button', { name: '另存为', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已另存为');
    expect(await fs.readFile(copy)).toEqual(await fs.readFile(fixture));
    await application.evaluate(({ dialog }, source) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: source }); }, fixture);
    await page.getByRole('button', { name: '另存为', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('不能覆盖自身');
    await page.getByRole('button', { name: '关闭提示' }).click();

    await page.getByRole('link', { name: '打开第二页' }).click();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.locator('.document-panel:not([hidden]) h1')).toHaveText('另一页');
    await fs.writeFile(sibling, '# 另一页\n\n已从磁盘更新\n');
    await page.getByRole('button', { name: '重新读取文件' }).click();
    await expect(page.locator('.document-panel:not([hidden]) .vp-doc')).toContainText('已从磁盘更新');
    await page.getByRole('button', { name: '查找', exact: true }).click();
    await page.getByRole('textbox', { name: '查找内容' }).fill('更新');
    await page.getByRole('button', { name: '关闭查找' }).click();
    await page.getByRole('button', { name: '关闭 第二页.md', exact: true }).click();
    await expect(page.getByRole('tab')).toHaveCount(1);
    await expect(page.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
    const third = path.join(directory, '相对 路径.md');
    await fs.writeFile(third, '# 从第二次启动打开\n');
    const child = spawn(require('electron'), [path.resolve('.'), `--user-data-dir=${path.join(directory, 'profile')}`, path.basename(third)], { cwd: directory, env: launchEnv, stdio: 'pipe' });
    const code = await new Promise((resolve, reject) => { child.on('exit', resolve); child.on('error', reject); });
    expect(code).toBe(0);
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.locator('.document-panel:not([hidden]) h1')).toHaveText('从第二次启动打开');
    await application.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }); }, fixture);
    await page.getByRole('button', { name: '文件', exact: true }).click();
    await page.getByRole('menuitem', { name: '打开…' }).click();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.locator('.document-panel:not([hidden]) h1')).toHaveText('静心阅读');
    expect(await fs.readFile(fixture, 'utf8')).toBe(markdown);
    expect(errors).toEqual([]);
  } finally {
    if (application) await application.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('工作区切换、右键菜单、面板拖拽与容器自适应', async () => {
  const directory = await fs.mkdtemp(path.join(os.homedir(), '.pi/work/emd-workspace-'));
  const outside = `${directory}-outside.md`;
  let application;
  const errors = [];
  try {
    const fixture = path.join(directory, '入口.md');
    const nested = path.join(directory, '章节', '正文.md');
    await fs.mkdir(path.dirname(nested));
    await fs.writeFile(fixture, '# 入口\n\n## 子标题\n\n开始阅读。');
    await fs.writeFile(nested, `---\ntitle: 宽屏检查\n---\n# 正文\n\n## 深入\n\n子目录文档。${'宽屏阅读时，正文应利用扣除侧栏后的剩余空间；打开、收起或调整面板宽度时，段落、引用和代码区域同步调整，左右保留适当的留白。'.repeat(10)}\n\n> 引用内容应随阅读容器展开。\n\n- 列表内容应随阅读容器展开。\n\n\`\`\`text\n代码内容应随阅读容器展开。\n\`\`\`\n\n| 内容 | 说明 |\n| --- | --- |\n| 表格 | 随阅读容器展开 |`);
    await fs.writeFile(outside, '# 工作区外部');
    application = await electron.launch({ args: [path.resolve('.'), '--ozone-platform=x11', `--user-data-dir=${path.join(directory, 'profile')}`, fixture], env: { ...process.env, XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache') } });
    const page = await application.firstWindow();
    page.on('pageerror', (error) => errors.push(error.message));
    const tree = page.getByRole('navigation', { name: '工作区文件' });
    await expect(tree.getByRole('treeitem', { name: 'MD 入口.md', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '本文目录' })).toBeVisible();
    await tree.getByRole('treeitem', { name: '章节', exact: true }).click();
    await tree.getByRole('treeitem', { name: 'MD 正文.md', exact: true }).click();
    await expect(page.getByRole('tab')).toHaveCount(1);
    await expect(page.locator('.document-panel:not([hidden]) h1')).toHaveText('正文');
    await expect(page.locator('.workspace-root')).toHaveAttribute('title', directory);
    await expect(tree.getByRole('treeitem', { name: 'MD 正文.md' })).toHaveAttribute('aria-selected', 'true');
    await tree.getByRole('treeitem', { name: 'MD 正文.md' }).click();
    await expect(page.getByRole('navigation', { name: '本文目录' }).getByRole('button', { name: '深入', exact: true })).toBeVisible();
    await tree.getByRole('treeitem', { name: 'MD 入口.md' }).click({ modifiers: ['Alt'] });
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.locator('.document-panel:not([hidden]) h1')).toHaveText('入口');
    await tree.getByRole('treeitem', { name: 'MD 入口.md' }).click({ modifiers: ['Alt'] });
    await expect(page.getByRole('tab')).toHaveCount(3);

    // Inspect the native menu and exercise its real click callback without an OS menu grab.
    await application.evaluate(({ Menu }) => {
      const original = Menu.buildFromTemplate;
      Menu.buildFromTemplate = (template) => {
        const menu = original(template);
        menu.popup = () => { global.workspaceMenu = menu; };
        return menu;
      };
    });
    await tree.getByRole('treeitem', { name: 'MD 正文.md' }).click({ button: 'right' });
    await expect.poll(() => application.evaluate(() => global.workspaceMenu?.items.map((item) => item.label))).toEqual(['在当前标签页打开', '在新标签页打开', '', '在文件管理器中显示', '刷新工作区']);
    await application.evaluate(() => global.workspaceMenu.items[0].click());
    await expect(page.locator('.document-panel:not([hidden]) h1')).toHaveText('正文');
    await expect(page.getByRole('tab')).toHaveCount(3);
    await fs.writeFile(path.join(directory, '新文档.md'), '# 新文档');
    await page.getByRole('button', { name: '刷新工作区', exact: true }).click();
    await expect(tree.getByRole('treeitem', { name: 'MD 新文档.md' })).toBeVisible();
    await expect(page.locator('.workspace-root')).toHaveAttribute('title', directory);
    await page.evaluate(async ({ root, outside }) => { await window.emd.workspaceOpen(root, outside, false, document.querySelector('[role=tab][aria-selected=true]').id.slice(4)); }, { root: directory, outside });
    await expect(page.getByRole('alert')).toContainText('文件不在当前工作区内');
    await expect(page.getByRole('tab')).toHaveCount(3);
    await page.getByRole('button', { name: '关闭提示' }).click();
    const selectedTab = await page.getByRole('tab', { selected: true }).getAttribute('id');
    await page.getByRole('tab').first().click({ button: 'middle' });
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.getByRole('tab', { selected: true })).toHaveAttribute('id', selectedTab);

    async function dimensions() {
      return page.evaluate(() => {
        const reading = document.querySelector('.reading-area').getBoundingClientRect();
        const panel = document.querySelector('.document-panel:not([hidden])');
        const article = panel.querySelector('.article');
        const box = article.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(article).paddingLeft);
        return { reading: reading.width, article: box.width, padding, left: box.left - reading.left, right: reading.left + panel.clientWidth - box.right, total: document.querySelector('.workspace').getBoundingClientRect().width, workspace: document.querySelector('.workspace-sidebar')?.getBoundingClientRect().width ?? 0, outline: document.querySelector('.outline').getBoundingClientRect().width };
      });
    }
    const before = await dimensions();
    const leftHandle = page.getByRole('separator', { name: '调整工作区宽度' });
    const handle = await leftHandle.boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 100);
    await page.mouse.down(); await page.mouse.move(handle.x + 62, handle.y + 100, { steps: 8 }); await page.mouse.up();
    await expect.poll(async () => (await dimensions()).workspace).toBeGreaterThan(before.workspace + 50);
    const afterLeft = await dimensions();
    expect(afterLeft.reading).toBeLessThan(before.reading - 50);
    expect(afterLeft.padding).toBeLessThan(before.padding);
    const rightHandle = page.getByRole('separator', { name: '调整目录宽度' });
    const rightBox = await rightHandle.boundingBox();
    await page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + 100);
    await page.mouse.down(); await page.mouse.move(rightBox.x - 48, rightBox.y + 100, { steps: 8 }); await page.mouse.up();
    await expect.poll(async () => (await dimensions()).outline).toBeGreaterThan(before.outline + 40);
    const afterBoth = await dimensions();
    expect(Math.abs(afterBoth.reading + afterBoth.workspace + afterBoth.outline + 5 - afterBoth.total)).toBeLessThan(1);
    expect(afterBoth.article).toBeLessThanOrEqual(afterBoth.reading);
    expect(Math.abs(afterBoth.left - afterBoth.right)).toBeLessThan(1);
    expect(await page.locator('.outline ul ul').first().evaluate((node) => getComputedStyle(node).borderLeftWidth)).toBe('0px');
    const overlay = await page.getByRole('button', { name: '折叠目录面板', exact: true }).boundingBox();
    const outlineBox = await page.locator('.outline').boundingBox();
    expect(Math.abs(overlay.y + overlay.height / 2 - outlineBox.y - outlineBox.height / 2)).toBeLessThan(1);

    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(900, 650));
    await expect(page.getByRole('navigation', { name: '本文目录' })).toHaveCount(0);
    await expect(tree).toBeVisible();
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(620, 650));
    await expect(tree).toHaveCount(0);
    await page.getByRole('button', { name: '显示工作区', exact: true }).click();
    await expect(tree).toBeVisible();
    expect((await dimensions()).reading).toBeGreaterThanOrEqual(360);
    await page.getByRole('button', { name: '展开目录面板', exact: true }).click();
    await expect(tree).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: '本文目录' })).toBeVisible();
    expect((await dimensions()).reading).toBeGreaterThanOrEqual(360);
    await page.screenshot({ path: path.join(os.homedir(), '.pi/work/emd-workspace-narrow.png') });
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1180, 850));
    await expect(tree).toBeVisible();
    await expect(page.getByRole('navigation', { name: '本文目录' })).toBeVisible();
    await page.getByRole('button', { name: '显示工作区', exact: true }).click();
    await expect(tree).toHaveCount(0);
    await page.getByRole('button', { name: '显示工作区', exact: true }).click();
    await expect(tree).toBeVisible();
    await page.screenshot({ path: path.join(os.homedir(), '.pi/work/emd-workspace-wide.png') });

    // Zoom supplies a 2360px layout viewport even when the window manager caps native window sizes.
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    await application.evaluate(({ BrowserWindow }, factor) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(factor), viewportWidth / 2360);
    await expect.poll(async () => (await dimensions()).total).toBeGreaterThan(2300);
    async function checkWideContent() {
      const sizes = await page.locator('.document-panel:not([hidden])').evaluate((panel) => {
        const article = panel.querySelector('.article');
        const content = panel.querySelector('.vp-doc').getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(article).paddingLeft);
        const blocks = ['.frontmatter-block', '.vp-doc h1', '.vp-doc h2', '.vp-doc > p', '.vp-doc blockquote', '.vp-doc pre', '.vp-doc table'].map((selector) => panel.querySelector(selector).getBoundingClientRect().width);
        const list = panel.querySelector('.vp-doc ul');
        return { available: panel.clientWidth, content: content.width, padding, left: content.left - panel.getBoundingClientRect().left, blocks,
          list: list.clientWidth - parseFloat(getComputedStyle(list).paddingLeft), item: list.querySelector('li').getBoundingClientRect().width };
      });
      expect(Math.abs(sizes.content - (sizes.available - sizes.padding * 2))).toBeLessThan(1);
      expect(Math.abs(sizes.left - sizes.padding)).toBeLessThan(1);
      expect(sizes.padding).toBeGreaterThanOrEqual(24);
      expect(sizes.padding).toBeLessThanOrEqual(120);
      for (const block of sizes.blocks) expect(Math.abs(block - sizes.content)).toBeLessThan(1);
      expect(Math.abs(sizes.item - sizes.list)).toBeLessThan(1);
      return sizes.content;
    }
    const bothOpen = await checkWideContent();
    await page.getByRole('button', { name: '显示工作区', exact: true }).click();
    await expect(tree).toHaveCount(0);
    const leftHidden = await checkWideContent();
    expect(leftHidden).toBeGreaterThan(bothOpen + 200);
    await page.getByRole('button', { name: '折叠目录面板', exact: true }).click();
    await expect(page.getByRole('navigation', { name: '本文目录' })).toHaveCount(0);
    const bothHidden = await checkWideContent();
    expect(bothHidden).toBeGreaterThan(leftHidden + 200);
    await page.screenshot({ path: path.join(os.homedir(), '.pi/work/emd-full-width.png') });
    await page.getByRole('button', { name: '显示工作区', exact: true }).click();
    await page.getByRole('button', { name: '展开目录面板', exact: true }).click();
    await expect(tree).toBeVisible();
    await expect(page.getByRole('navigation', { name: '本文目录' })).toBeVisible();
    expect(await checkWideContent()).toBeCloseTo(bothOpen, 0);
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));
    await page.getByRole('tab', { selected: true }).click({ button: 'middle' });
    await expect(page.getByRole('tab')).toHaveCount(1);
    await expect(page.locator('.document-panel:not([hidden]) h1')).toHaveText('入口');
    await page.getByRole('tab').click({ button: 'middle' });
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '打开 Markdown' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (application) await application.close();
    await fs.rm(directory, { recursive: true, force: true });
    await fs.rm(outside, { force: true });
  }
});
