# ScreepsScripts 上下文

## 项目目标

本仓库是一个新的 Screeps AI 代码库。旧的单房间生存代码已被有意移除。项目现在围绕 Trellis 规划、TypeScript-only 运行时代码、TDD、自动化验证和人类可读的运维文档重建。

## 当前游戏状态

- Active production room 已记录为 `shard1 / W51N21`。
- Spawn 已记录为 `Spawn1` at `35,23`。
- Screeps branch `main` 已用于上一轮自持 bootstrap 部署 readback；本轮源码迭代尚未 live deploy，blocked reason 已记录在 `docs/game-state.md`。
- heartbeat 的自然生产 tick 执行已通过 console websocket 验证。
- 当前源码运行时行为是 tick heartbeat、Memory 边界和自持 bootstrap：runtime boundary 执行 `spawnCreep`、worker 采集 source、回补 spawn 和 controller upgrade action。
- 当前源码在 300 energy 可用时优先孵化 `[WORK, CARRY, CARRY, MOVE, MOVE]` early worker；只有 200 energy 可用时保留 `[WORK, CARRY, MOVE]` emergency worker。
- 当前源码会按 worker 名称在同房间多 source 间确定性分配采集目标，避免所有 worker 固定选择第一个 source。

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
