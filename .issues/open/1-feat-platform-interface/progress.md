# Issue 1 当前 checkpoint

macOS PR 已审查、修复安装失败后的 LaunchServices 恢复，并 squash 合入主线。组合实现已汇总；平台接口和 Windows 全屏修复的独立审查通过，Linux/Windows 原生 CI 已通过。macOS 打包与安装通过，原生编辑夹具的粘贴验证仍未收口，本 issue 保持 open，PR #2 暂不合入。

来源、审查、各轮 CI 与诊断入口见 [artifacts](artifacts/)。

当前只推进 issue 1。其他 issue 的原型保留在各自 worktree，完整功能暂停。下一步是限定原生诊断后判断产品权限、Cocoa 路径或测试夹具的实际原因，不能以跳过粘贴、放宽权限或重复运行掩盖失败。
