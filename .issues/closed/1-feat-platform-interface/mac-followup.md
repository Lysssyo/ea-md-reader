# macOS 实机行为跟进

交接入口：[PR #2](https://github.com/yceachan/ea-md-reader/pull/2)，请 @Lysssyo 协助。当前未确认 macOS 产品粘贴存在故障；已确认的是自动化中原生复制成功、Cocoa paste 有时不产生输入，原因尚未定位。

请在实际 Mac 的 emd 查找框验证 Cmd+A/C/V 与编辑菜单的选择、复制、粘贴，区分实际键盘、实际菜单和测试注入的行为。若实机正常，修正自动化夹具；若实机也失败，基于最小复现修正 macOS 实现。保留当前 HTML 权限隔离，未经复现不修改产品权限策略。

确认后在此 PR 留下系统/架构、操作路径、结果和对应修复 PR。CI 的 macOS 结果继续显式保留，不作为 Linux 功能开发的阻塞门槛。现有证据入口见 [artifacts/ci-fixes.md](artifacts/ci-fixes.md)。
