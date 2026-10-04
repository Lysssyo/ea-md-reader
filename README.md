# Ea.Md.Reader (emd)

使用 [ea.kb,io](https://yceachan.github.io/) 排版的只读 Markdown 桌面阅读器，基于 Electron。使用自行绘制的标题栏、窗口按钮与文件菜单，窗口圆角为 10px。仓库名为 `ea-md-reader`，界面标识为 `Ea.Md.Reader`，终端命令名为 `emd`。

## Os Plat

- KDE
- Gnome (todo)
- Mac (todo)
- Windows (todo)

KDE、GNOME 是 Linux 桌面环境；`mac`、`windows` 对应操作系统。脚本的平台标识为 `kde`、`gnome`、`mac`、`windows`，目前只有 `kde` 接入现有打包、安装和卸载流程，其余入口明确返回 TODO。

## 使用

```sh
# teminal
emd 文档.md
emd "带 空格的文件.md" 第二页.md
emd
# 
#just open md file with emd
```

命令立即返回；应用通过 `setsid` 独立运行，关闭终端后继续阅读。再次运行命令会将文件打开到已有窗口的新标签页；同一文件复用已有标签页。桌面应用菜单中可搜索 **Ea.Md.Reader**，Dolphin 的 Markdown 文件「打开方式」中可选择 **Ea.Md.Reader**。

界面提供文件菜单、打开、另存为、多标签页、工作区、目录面板、查找、统一亮色主题和重新读取文件。左侧工作区以打开文件的所在目录为根，递归显示 Markdown 文件及其所在文件夹，不遍历符号链接目录。普通点击在当前标签页打开，`Alt` 点击新开标签页；右键菜单提供打开方式、在文件管理器中显示和刷新。进入子目录文件时保留工作区根目录，切换到工作区外的文件时以它的所在目录建立新工作区。顶部最左侧按钮显示或隐藏工作区。

左右侧栏均可拖拽边界调整宽度，也可聚焦边界后用左右方向键调整。TOC 使用独立面板，章节以缩进区分层级，折叠按钮位于面板左侧中央。窗口变窄时先收起 TOC，再收起工作区，保留手动展开入口；放宽窗口后恢复面板。正文使用扣除可见侧栏后的容器宽度，段落、标题、引用、代码和文档属性均随容器展开；左右边距随容器调整，不设固定阅读列宽。

源文件保持只读；**另存为保存打开时的原始 Markdown 字节**，包括 BOM、CRLF 和 frontmatter，禁止覆盖源文件及其硬链接。磁盘内容改变后按 `Ctrl+R` 重新读取。另存为不会复制引用的图片，移动文档时需要同时保留图片及其相对位置。

| 操作 | 快捷键 |
| --- | --- |
| 打开文件，可多选 | Ctrl+O |
| 另存为 | Ctrl+Shift+S |
| 关闭当前标签页 | Ctrl+W |
| 鼠标关闭指定标签页 | 中键点击标签页 |
| 切换标签页 | Ctrl+Tab / Ctrl+Shift+Tab |
| 重新读取文件 | Ctrl+R |
| 文内查找 | Ctrl+F；Enter / Shift+Enter |
| 放大 / 缩小 / 恢复 | Ctrl++ / Ctrl+- / Ctrl+0 |

支持 UTF-8 文件，扩展名 `.md`、`.markdown`、`.mdown`、`.mkd`、`.mkdn`、`.mdx`（MDX 按普通 Markdown 阅读，不执行 JSX）。支持 GFM 表格、任务列表、GitHub alerts、`:::callout`、KaTeX 公式、Shiki 代码高亮、Mermaid 和图片放大。相对路径图片按当前文档目录解析；Markdown 相对链接打开为标签页，网页链接交给系统浏览器。

## 构建与用户级安装（Linux）

需要 Node.js 22.12+、npm、`setsid`（util-linux）、ImageMagick（`magick`）及 `desktop-file-utils`，运行 Electron 需要图形会话和系统图形库。

```sh
npm ci
npm run pack
npm run install:local
```

也可以显式选择平台，原来的不带参数命令继续可用：

```sh
npm run pack -- --platform=kde
npm run install:local -- --platform=kde
npm run uninstall:local -- --platform=kde
node scripts/install.mjs --platform=kde /路径/到/解压目录
```

不指定平台时按当前机器选择：Linux GNOME 会命中 `gnome` 的 TODO 入口，其他 Linux 环境沿用 KDE 配置（包括没有桌面环境的构建机器）；macOS 和 Windows 分别命中 `mac`、`windows` 的 TODO 入口。显式选择 KDE 时仍要求 Linux 主机，本轮没有实现跨系统构建。TODO 平台在构建、外部命令和安装文件写入前退出。

产物在 `release/linux-unpacked/` 和 `release/emd-0.1.0-linux-x64.tar.gz`。安装脚本将已打包应用复制到 `${XDG_DATA_HOME:-~/.local/share}/emd`，创建 `~/.local/bin/emd` 和用户级 desktop/MIME 入口，无需 root 权限。确认 `~/.local/bin` 在 `PATH` 中即可运行命令。

便携压缩包解压后可直接运行其中的 `emd` 二进制；使用终端脱离功能及桌面入口，请使用上述安装脚本。也可以给安装脚本指定解压后的目录：

```sh
node scripts/install.mjs /路径/到/解压目录
```

安装会注册 `text/markdown` 与 `text/x-markdown` 的打开方式，不修改默认应用设置。若要自行设为默认：

```sh
xdg-mime default io.github.yceachan.emd.desktop text/markdown
xdg-mime default io.github.yceachan.emd.desktop text/x-markdown
```

日志在 `${XDG_STATE_HOME:-~/.local/state}/emd/emd.log`。卸载：

```sh
npm run uninstall:local
```

## 平台接入与依赖审查

`scripts/platforms.mjs` 是平台登记与选择入口，`scripts/pack.mjs` 和 `scripts/install.mjs` 负责参数解析与分派。现有实现位于 `scripts/platforms/kde.mjs`，Linux 打包目标、`desktopName` 和安装集成都由该模块提供；`package.json` 保留公共构建配置。

未来接入平台时，在登记表添加模块加载函数，并实现三个导出：`packOptions`（传给 electron-builder 的平台构建选项）、`install({ root, home, source })`、`uninstall({ root, home, source })`。`root` 是仓库目录，`home` 是当前用户目录，`source` 是可选的解包产物目录；省略 `source` 时由平台模块确定默认产物位置。平台的依赖检查、安装路径、启动器、文件关联、图标注册与卸载逻辑放在自己的模块中。

| 位置 | 当前平台依赖 | 后续接入范围 |
| --- | --- | --- |
| `scripts/platforms/kde.mjs`、`assets/emd.desktop` | Linux 解包目录和可执行文件；XDG 数据/日志目录、`~/.local/bin`、`/bin/sh`、`setsid`、desktop/MIME 与 hicolor 图标；`desktop-file-validate`、`update-desktop-database`、KDE Plasma 6 的 `kbuildsycoca6` | GNOME 集成验证；macOS、Windows 各自的安装与卸载模块 |
| `scripts/render-icons.mjs` | 构建机需要 ImageMagick `magick`；目前从 SVG 生成 PNG 图标 | macOS 的 ICNS、Windows 的 ICO 仍待接入，继续以 `assets/emd.svg` 为唯一设计源 |
| `electron/main.cjs` | Linux 的 `setDesktopName`；当前无边框透明窗口、自绘窗口按钮、应用菜单、快捷键和关闭窗口即退出的生命周期 | 各系统的窗口行为、macOS 菜单/Dock/生命周期、文件打开及快捷键验证 |
| `src/App.tsx`、`src/components/Workspace.tsx` | 工作区根目录和后代判断使用 `/` | Windows 路径分隔符、盘符与 UNC 路径处理；本轮不改运行时 |
| `electron/files.cjs`、本地资源协议 | 使用 Node 的 `path`、`fs`、文件 URL；原始字节保存和 inode 覆盖保护 | 各系统的文件系统语义、符号链接、本地资源 URL 验证 |
| `tests/reader.spec.cjs` | 强制 X11，依赖 `xprop` 检查窗口图标；安装模块测试遵循当前 Linux 环境 | GNOME/Wayland、macOS、Windows 的原生窗口和安装验证 |

这些是本轮审查结果与待接入位置，GNOME、macOS、Windows 功能保持 TODO。

## 开发与验证

```sh
npm start
npm test
```

`npm test` 进行类型检查、生产构建、原始字节保存与覆盖保护、工作区扫描、平台入口、隔离安装与卸载测试，以及真实 Electron 无边框窗口测试：公式、代码、图表、相对图片、多标签、另存为、重新读取、重复启动、HTML 清理、工作区文件切换及右键菜单、面板拖拽与窄窗口布局。需要运行图形会话和 `xprop`（用于原生窗口图标检查）；无头 Linux 可用 `xvfb-run -a npm test`。测试临时文件在 `~/.pi/work/`。

主进程负责文件与原生菜单，沙箱化渲染进程只通过限定的 IPC 接口操作已打开的文件。文档 HTML 经 DOMPurify 清理，应用使用独立协议与 CSP，文档脚本不会执行。

## 排版来源

渲染器与主题来源[yceachan.github.io](https://github.com/yceachan/yceachan.github.io)

- `src/markdown.css`：原 `src/index.css` 的阅读色彩、frontmatter 和 `.vp-doc` 样式。
- `src/lib/markdown.ts`、`shiki.ts`、`slugify.ts`：原渲染链；针对桌面阅读补充 HTML 清理、属性转义和 BOM/CRLF 处理。
- `src/components/Article.tsx`：沿用原 Mermaid、图片缩放的呈现方式，加入本地图片协议和明确的错误提示。

## 开源许可

MIT [LICENSE](LICENSE)。

应用图标以 `assets/emd.svg` 为唯一设计源：暖陶色底板、展开的书页与 Markdown 符号。`npm run build:icons` 生成窗口用 PNG 和 16–512px 的桌面图标；安装时图标名称与应用 ID 一致，并给 desktop 入口写入明确的 PNG 路径。
