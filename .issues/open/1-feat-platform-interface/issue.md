# Issue 1：macOS 集成与共享平台边界

状态：实现已汇总，等待最终四平台 CI 与独立审查后合入。本文是需求与验收的唯一来源。

## 原始需求

> review gh pr1 mac bundle 的改动，合入 main 主线。app 定义好接口，各个平台实现 port impl。快捷键在 app 里有统一语义层 config，再映射到不同平台实际键位。没有 mac 机器，所以搭建 GitHub Actions cross-platform CI。

后续授权要求先固定现有改动与 PR 来源，按 checkpoint 审查交付。2026-10-07 收束范围：本阶段只完成 issue 1，其他 issue 保留已有产物。

## 目标与范围

审查 macOS 打包、用户级安装和系统文件打开，修复已确认的恢复故障并合入主线。组合版本保留原工作区的 HTML 阅读能力，以独立协议和 iframe 沙箱隔离文档脚本，补齐 macOS HTML 打开关联。

运行时由应用定义所需平台能力，Linux、macOS、Windows 实现真实系统差异。菜单、按钮、提示和键盘输入共用语义命令。工作区路径关系由主进程使用 Node 路径 API 计算。

四种原生运行机验证共享构建、文件与命令行为、真实 Electron UI；Linux 和两种 macOS 架构额外验证现有打包安装能力。Windows/GNOME 安装器及 Developer ID、公证不在范围内。F12、设置、布局、编辑器、Android 留在各自 issue。

## 验收

| 条件 | 判定 |
| --- | --- |
| A1.1 macOS PR 审查与合入 | 最终 head 审查闭环，Linux、macOS arm64/x64 原生验证通过，记录主线合并提交 |
| A1.2 最小平台接口 | 平台选择集中；系统事件、身份、菜单和键位归属于平台模块；通用 Electron/Node 行为继续共享 |
| A1.3 单一命令来源 | 打开、另存为、关标签、重读、查找、切换标签、退出、缩放、全屏和文件菜单共用定义；提示与键位一致，单次输入只分派一次 |
| A1.4 四平台共享验证 | Linux x64、macOS arm64/x64、Windows x64 都运行共享构建、文件/命令与原生 UI 检查；专属跳过说明原因 |
| A1.5 原生安装验证 | macOS 两架构验证产物、系统文件打开、隔离安装、升级失败恢复、重复卸载与源文件不变；Linux 既有检查继续通过 |
| A1.6 可追溯失败与支持范围 | CI 保存报告、截图、日志、追踪与支持平台的档案；Windows/GNOME 安装明确失败 |
| A1.7 集成来源完整 | 原工作区 HTML 改动与 macOS PR 的来源固定；组合行为、只读、文件权限和隔离边界验证通过 |

现有关闭最后窗口即退出的行为保持一致。实施机制见 [ADR](adr.md)，验证方法见 [route](route.md)，当前门槛见 [progress](progress.md)。
