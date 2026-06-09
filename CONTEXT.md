# ScreepsScripts 上下文

## 项目目标

本仓库是一个新的 Screeps AI 代码库。旧的单房间生存代码已被有意移除。项目现在围绕 Trellis 规划、TypeScript-only 运行时代码、TDD、自动化验证和人类可读的运维文档重建。

## 当前游戏状态

- 仓库中尚未记录 active production room 或 spawn。
- 可见 shard 已记录为 `shard3`，但 room ownership 和 spawn 事实仍处于 blocked 状态。
- Screeps branch `main` 已用于代码部署 readback；远端 `main` 与本地 `dist/main.js` 一致。
- heartbeat 的自然生产 tick 执行尚未验证。
- 当前第一个已提交运行时行为只是用于验证工具链的 tick heartbeat。

## 领域语言

- `loop`：Screeps 运行时入口，每个 game tick 调用一次。
- `tick`：一个 Screeps 游戏步。
- `runtime boundary`：读取 `Game`、`console` 等 Screeps 全局对象的代码。
- `kernel`：`loop` 背后的 tick 级编排代码。
- `telemetry`：运行时代码返回并由测试断言的可观察 tick 元数据。

## 架构规则

- 运行时 JavaScript 必须以 TypeScript 编写。
- Screeps 全局对象只在 runtime boundary 读取，不散落在策略模块中。
- 策略工作通过小型公开接口和 TDD 垂直切片进入。
- 不保留对已删除的 2021 role-based 设计的兼容。
- 不为假设性行为添加 mode、flag 或 options 参数。
- 在相关 room state 和验收标准明确前，不实现游戏策略。
