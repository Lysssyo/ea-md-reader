# Ea.Md.Reader (emd)

使用 [ea.kb,io](https://yceachan.github.io/) 排版的只读 Markdown 桌面阅读器，基于 Electron。使用自行绘制的标题栏、窗口按钮与文件菜单，窗口圆角为 10px。仓库名为 `ea-md-reader`，界面标识为 `Ea.Md.Reader`，终端命令名为 `emd`。

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

界面提供文件菜单、打开、另存为、多标签页、可折叠目录面板、查找、统一亮色主题和重新读取文件。目录面板在窄屏自动折叠，仍保留展开入口；展开后可单独折叠目录树章节。源文件保持只读；**另存为保存打开时的原始 Markdown 字节**，包括 BOM、CRLF 和 frontmatter，禁止覆盖源文件及其硬链接。磁盘内容改变后按 `Ctrl+R` 重新读取。另存为不会复制引用的图片，移动文档时需要同时保留图片及其相对位置。

| 操作 | 快捷键 |
| --- | --- |
| 打开文件，可多选 | Ctrl+O |
| 另存为 | Ctrl+Shift+S |
| 关闭当前标签页 | Ctrl+W |
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

## 开发与验证

```sh
npm start
npm test
```

`npm test` 进行类型检查、生产构建、原始字节保存与覆盖保护测试，以及真实 Electron 无边框窗口测试：公式、代码、图表、相对图片、多标签、另存为、重新读取、重复启动和 HTML 清理。需要运行图形会话和 `xprop`（用于原生窗口图标检查）；无头 Linux 可用 `xvfb-run -a npm test`。测试临时文件在 `~/.pi/work/`。

主进程负责文件与原生菜单，沙箱化渲染进程只通过限定的 IPC 接口操作已打开的文件。文档 HTML 经 DOMPurify 清理，应用使用独立协议与 CSP，文档脚本不会执行。

## 排版来源

渲染器与主题来源[yceachan.github.io](https://github.com/yceachan/yceachan.github.io)

- `src/markdown.css`：原 `src/index.css` 的阅读色彩、frontmatter 和 `.vp-doc` 样式。
- `src/lib/markdown.ts`、`shiki.ts`、`slugify.ts`：原渲染链；针对桌面阅读补充 HTML 清理、属性转义和 BOM/CRLF 处理。
- `src/components/Article.tsx`：沿用原 Mermaid、图片缩放的呈现方式，加入本地图片协议和明确的错误提示。

## 开源许可

MIT [LICENSE](LICENSE)。

应用图标以 `assets/emd.svg` 为唯一设计源：暖陶色底板、展开的书页与 Markdown 符号。`npm run build:icons` 生成窗口用 PNG 和 16–512px 的桌面图标；安装时图标名称与应用 ID 一致，并给 desktop 入口写入明确的 PNG 路径。
