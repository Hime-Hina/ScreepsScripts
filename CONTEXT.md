# ScreepsScripts 上下文

## 项目目标

本仓库是一个新的 Screeps AI 代码库。旧的单房间生存代码已被有意移除。项目现在围绕 Trellis 规划、TypeScript-only 运行时代码、TDD、自动化验证和人类可读的运维文档重建。

## 当前游戏状态

- Active production room 已记录为 `shard1 / W51N21`。
- Spawn 已记录为 `Spawn1` at `35,23`。
- Screeps branch `main` 已用于本轮生产逻辑迭代部署；API readback 已确认远端 `main` module 与本地 `dist/main.js` 一致。
- heartbeat 的自然生产 tick 执行已通过 console websocket 验证。
- 当前源码运行时行为是 tick heartbeat、Memory 边界和 RCL2 自持经济循环：runtime boundary 执行 `spawnCreep`、extension construction site 创建、worker 采集 source、补能 spawn/extension、critical spawn/extension/container/road repair、build construction site 和 controller upgrade action。
- 当前源码在 300 energy 可用时优先孵化 `[WORK, CARRY, CARRY, MOVE, MOVE]` early worker；只有 200 energy 可用时保留 `[WORK, CARRY, MOVE]` emergency worker。
- 当前源码会按 worker 名称在同房间多 source 间确定性分配采集目标，避免所有 worker 固定选择第一个 source。
- 当前源码会在 RCL2 owned room 为缺失 extension 规划 construction site，并维护已有 spawn/extension/container/road 的 critical repair fallback；暂不做 road/container planner、wall/rampart fortification、tower 或完整 base planner。
- 当前源码会在 runtime boundary 捕获 owned room hostile creep body/owner/hits/position、controller safe mode 字段和核心 owned structures；pure defense planner 识别攻击、远程攻击、拆除、治疗和 near-core 威胁，危险 hostile 接近核心结构时产出 `activateSafeMode` decision，runtime boundary 执行 `controller.activateSafeMode`。有攻击/拆除威胁但未接近核心结构时，room defense state 会暂停非关键 construction build。
- 当前源码会在 runtime boundary 捕获 `Game.cpu` snapshot，kernel 根据 bucket 选择 full 或 survival-only tick budget；survival-only 保留 defense、emergency spawn 和 controller upgrade，跳过非关键 construction/repair。runtime operation 按关键性分组隔离，关键失败通过 `Game.notify` 发送结构化 critical fallback 后抛出，非关键失败输出结构化 actionable 事件后继续。tick heartbeat 以 `[HERMES_EVENT]` JSON 输出 CPU snapshot、budget decision 和每房间 workers/spawnEnergy/construction/hostiles 摘要。
- 当前源码包含 `planRoomRecovery` 纯诊断分类，识别 `roomHealthy`、`roomDegraded`、`spawnMissing`、`creepPopulationMissing`、`controllerLost` 和 `rebuildBlocked`；当前只输出诊断，不生成跨房 rebuild request，不做 pathfinding 或 claim。

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
