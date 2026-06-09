# Issue 跟踪

本仓库使用 `Hime-Hina/ScreepsScripts` 的 GitHub Issues 跟踪工作。

如果本地有可用的 GitHub 凭据，创建或更新 issue 的自动化应使用 `gh` CLI。如果 `gh` 不可用或未认证，把拟发布的 issue 正文写入当前 Trellis 任务，并把 GitHub 发布保留为明确的手动步骤。

Issue 正文应包含：

- 可观察行为或面向玩家的目标。
- 验收标准。
- 相关 Screeps room、shard、branch 或模拟上下文。
- 测试预期。

除非明确替换 GitHub 工作流，否则不要创建本地 Markdown issue。
