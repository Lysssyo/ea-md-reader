# 第一轮原生 CI 故障与修复

对象：0decc43；run https://github.com/yceachan/ea-md-reader/actions/runs/37532844526 。Linux 成功。Windows 共享构建、Node 与4项UI成功，全屏失败；macOS arm64共享构建、Node、5项UI成功，复制夹具与已打包签名验证失败。Intel 与 arm64 出现相同的复制夹具和签名故障，完整状态见 ci-first.json。

Windows：失败时追踪 viewport 从1024x720变成1024x768，但 isFullScreen() 返回 false。https://github.com/electron/electron/blob/v44.5.1/shell/browser/native_window_views.cc#L759 证实透明薄框分支只 SetBounds，IsFullscreen 却读取 widget 状态。端口改用 enter/leave 事件状态，测试验证实际显示器边界和退出后的原边界。

macOS 签名：job log 明确报告 Current build is a part of pull request, code signing will be skipped。CI 显式启用 CSC_FOR_PULL_REQUEST；现有 mac adapter identity 为 '-'，只执行 ad-hoc 签名，无 Developer ID 凭证。codesign --verify --deep --strict 验收保留。

macOS 编辑夹具：sendInputEvent 的 Cmd+C 不触发 Cocoa selector，与 Electron 上游 https://github.com/electron/electron/issues/6338 一致。测试保留实际应用键盘消费检查，另使用 Menu.sendActionToFirstResponder 验证原生选取/复制/粘贴；不改产品编辑行为，不把 selector 调用当物理键盘输入。

完整 job 输出在 first-ci-windows.log、first-ci-mac.log，失败截图与追踪在该 run artifact。

## 第二轮 Intel 编辑夹具

f95ed9e 的 run https://github.com/yceachan/ea-md-reader/actions/runs/37534770335 中，Windows、Linux、macOS arm64 成功；Intel 的构建、Node、其余 UI 和原生打包安装成功，仅粘贴断言失败。选区与原生复制已成功。trace 显示 fill('') 后立即注入 CmdV/Cocoa paste，未观测同一字段 React effect 的 stopFindInPage('clearSelection') 是否完成，因此不能据此断定产品粘贴故障或竞争已被证实。

夹具增加真实 clearSelection 调用完成的观察门槛，并在粘贴前断言字段仍聚焦且为空；保留最终剪贴板/粘贴结果断言，不改产品逻辑、不增加重试或固定等待。完整日志在 second-ci-intel.log，原生 CI 必须重新验证。
