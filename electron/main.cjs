const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, net, shell, nativeTheme, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { fileArguments, readDocument, publicDocument, saveDocument, scanWorkspace, isWithin, IMAGE_TYPES } = require('./files.cjs');

app.setName('emd');
nativeTheme.themeSource = 'light';
if (process.platform === 'linux') app.setDesktopName('io.github.yceachan.emd.desktop');
protocol.registerSchemesAsPrivileged([
  { scheme: 'emd', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'emd-asset', privileges: { standard: true, secure: true } },
]);
let window;
let rendererReady = false;
const documents = new Map();
const workspaceRoots = new Set();
const pending = [];
const isPrimary = app.requestSingleInstanceLock();

function send(channel, payload) {
  if (rendererReady) window.webContents.send(channel, payload);
  else pending.push([channel, payload]);
}
function showError(error) {
  send('emd:error', error.message);
}
async function openPaths(paths) {
  for (const filePath of paths) {
    try {
      const document = await readDocument(filePath);
      const existing = [...documents.values()].find((item) => item.path === document.path);
      if (existing) send('emd:activate', existing.id);
      else {
        documents.set(document.id, document);
        send('emd:document', publicDocument(document));
      }
    } catch (error) {
      showError(new Error(`${filePath}\n${error.message}`));
    }
  }
}
async function openDialog() {
  const result = await dialog.showOpenDialog(window, {
    title: '打开 Markdown', properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mdx'] }],
  });
  if (!result.canceled) await openPaths(result.filePaths);
}
function getDocument(id) {
  if (typeof id !== 'string' || !documents.has(id)) throw new Error('文件已关闭。');
  return documents.get(id);
}
function checkedHandler(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (event.sender !== window.webContents || event.senderFrame.url !== 'emd://app/index.html') throw new Error('无效的应用请求。');
    try { return await handler(...args); }
    catch (error) { showError(error); return null; }
  });
}
function menuAction(action) { send('emd:action', action); }

if (!isPrimary) app.quit();
else {
  app.on('second-instance', (_event, argv, cwd) => {
    openPaths(fileArguments(argv, cwd));
    if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
  });
  app.on('open-file', (event, filePath) => { event.preventDefault(); openPaths([filePath]); });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    protocol.handle('emd', (request) => {
      const url = new URL(request.url);
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(__dirname, '..', 'dist', `.${pathname}`);
      const root = path.resolve(__dirname, '..', 'dist');
      if (url.host !== 'app' || !file.startsWith(`${root}${path.sep}`)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).href);
    });
    protocol.handle('emd-asset', async (request) => {
      try {
        const url = new URL(request.url);
        const document = getDocument(url.host);
        const assetPath = path.resolve(path.dirname(document.path), decodeURIComponent(url.pathname.slice(1)));
        const mime = IMAGE_TYPES[path.extname(assetPath).toLowerCase()];
        if (!mime) return new Response('Unsupported image type', { status: 415 });
        return new Response(await fs.readFile(assetPath), { headers: { 'Content-Type': mime, 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } });
      } catch (error) {
        console.error('Cannot read image:', error.message);
        return new Response('Image unavailable', { status: 404 });
      }
    });
    window = new BrowserWindow({
      width: 1180, height: 850, minWidth: 620, minHeight: 440, show: false, frame: false, transparent: true,
      title: 'Ea.Md.Reader', backgroundColor: '#00000000', icon: nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'emd.png')).resize({ width: 128, height: 128 }),
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window.webContents.session.setPermissionCheckHandler(() => false);
    Menu.setApplicationMenu(null);
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const key = input.key.toLowerCase();
      const control = input.control || input.meta;
      if (key === 'f11') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); return; }
      if (input.alt && key === 'f') { event.preventDefault(); menuAction('fileMenu'); return; }
      if (!control || input.alt) return;
      if (key === 'o') { event.preventDefault(); openDialog().catch(showError); }
      else if (key === 's' && input.shift) { event.preventDefault(); menuAction('save'); }
      else if (key === 'w') { event.preventDefault(); menuAction('close'); }
      else if (key === 'r') { event.preventDefault(); menuAction('reload'); }
      else if (key === 'f') { event.preventDefault(); menuAction('find'); }
      else if (key === 'tab') { event.preventDefault(); menuAction(input.shift ? 'previous' : 'next'); }
      else if (key === 'q') { event.preventDefault(); app.quit(); }
      else if (key === '+' || key === '=') { event.preventDefault(); window.webContents.setZoomLevel(window.webContents.getZoomLevel() + 0.5); }
      else if (key === '-') { event.preventDefault(); window.webContents.setZoomLevel(window.webContents.getZoomLevel() - 0.5); }
      else if (key === '0') { event.preventDefault(); window.webContents.setZoomLevel(0); }
    });
    window.on('maximize', () => send('emd:window-state', true));
    window.on('unmaximize', () => send('emd:window-state', false));
    checkedHandler('emd:window', (action) => {
      if (action === 'minimize') window.minimize();
      else if (action === 'maximize') { if (window.isMaximized()) window.unmaximize(); else window.maximize(); }
      else if (action === 'close') window.close();
      else throw new Error('无效的窗口操作。');
    });
    checkedHandler('emd:ready', () => {
      rendererReady = true;
      send('emd:window-state', window.isMaximized());
      for (const [channel, payload] of pending.splice(0)) window.webContents.send(channel, payload);
    });
    checkedHandler('emd:open', openDialog);
    checkedHandler('emd:workspace', async (id, requestedRoot) => {
      const document = getDocument(id);
      const root = requestedRoot ?? path.dirname(document.path);
      if (root !== path.dirname(document.path) && (!workspaceRoots.has(root) || !isWithin(root, document.path))) throw new Error('无效的工作区请求。');
      const workspace = await scanWorkspace(root);
      workspaceRoots.add(root);
      return workspace;
    });
    checkedHandler('emd:workspace-open', async (root, filePath, newTab, activeId) => {
      if (!workspaceRoots.has(root) || typeof filePath !== 'string' || typeof newTab !== 'boolean') throw new Error('无效的工作区请求。');
      const canonicalPath = await fs.realpath(filePath);
      if (!isWithin(root, canonicalPath)) throw new Error('文件不在当前工作区内。');
      const document = await readDocument(canonicalPath);
      if (!newTab) { getDocument(activeId); document.id = activeId; }
      documents.set(document.id, document);
      send('emd:document', publicDocument(document));
    });
    checkedHandler('emd:workspace-menu', async (root, filePath, activeId) => {
      if (!workspaceRoots.has(root) || typeof filePath !== 'string') throw new Error('无效的工作区请求。');
      const canonicalPath = await fs.realpath(filePath);
      if (canonicalPath !== root && !isWithin(root, canonicalPath)) throw new Error('文件不在当前工作区内。');
      getDocument(activeId);
      const isFile = (await fs.stat(canonicalPath)).isFile();
      Menu.buildFromTemplate([
        ...(isFile ? [
          { label: '在当前标签页打开', click: () => send('emd:workspace-action', { action: 'open', path: canonicalPath }) },
          { label: '在新标签页打开', click: () => send('emd:workspace-action', { action: 'new-tab', path: canonicalPath }) },
          { type: 'separator' },
        ] : []),
        { label: '在文件管理器中显示', click: () => shell.showItemInFolder(canonicalPath) },
        { label: '刷新工作区', click: () => send('emd:workspace-action', { action: 'refresh' }) },
      ]).popup({ window });
    });
    checkedHandler('emd:save', async (id) => {
      const document = getDocument(id);
      const result = await dialog.showSaveDialog(window, {
        title: '另存为 Markdown', defaultPath: document.path,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
      });
      if (result.canceled) return null;
      await saveDocument(document, result.filePath);
      return result.filePath;
    });
    checkedHandler('emd:close', (id) => { getDocument(id); documents.delete(id); });
    checkedHandler('emd:reload', async (id) => {
      const old = getDocument(id);
      const document = await readDocument(old.path);
      document.id = id;
      documents.set(id, document);
      return publicDocument(document);
    });
    checkedHandler('emd:link', async (id, href) => {
      const document = getDocument(id);
      if (typeof href !== 'string') throw new Error('无效的链接。');
      if (/^(https?:|mailto:)/i.test(href)) { await shell.openExternal(href); return; }
      if (/^[a-z][a-z\d+.-]*:/i.test(href) && !href.startsWith('file:')) throw new Error('不支持此链接协议。');
      const filePath = href.startsWith('file:') ? require('node:url').fileURLToPath(href.split('#')[0]) : path.resolve(path.dirname(document.path), decodeURIComponent(href.split('#')[0]));
      await openPaths([filePath]);
      if (href.includes('#')) send('emd:anchor', decodeURIComponent(href.slice(href.indexOf('#') + 1)));
    });
    checkedHandler('emd:find', (text, forward) => {
      if (typeof text !== 'string' || typeof forward !== 'boolean') throw new Error('无效的查找请求。');
      if (text) window.webContents.findInPage(text, { forward, findNext: true });
      else window.webContents.stopFindInPage('clearSelection');
    });
    window.once('ready-to-show', () => window.show());
    await window.loadURL('emd://app/index.html');
    await openPaths(fileArguments(process.argv, process.cwd()));
  }).catch((error) => { console.error(error); dialog.showErrorBox('emd 启动失败', error.message); app.exit(1); });
}
