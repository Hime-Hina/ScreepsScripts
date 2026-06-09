# 架构

## 运行时流程

```mermaid
flowchart LR
  Screeps["Screeps 运行时"] --> Main["src/main.ts loop"]
  Main --> Boundary["运行时边界"]
  Boundary --> Memory["Memory 边界"]
  Boundary --> SpawnSnapshot["Spawn/Creep 快照"]
  Memory --> Kernel["runTick"]
  SpawnSnapshot --> Kernel
  Kernel --> Spawning["src/spawning"]
  Spawning --> SpawnDecision["SpawnDecision"]
  SpawnDecision --> Actions["运行时动作执行（未来）"]
  Kernel --> Telemetry["TickTelemetry"]
```

`src/main.ts` 刻意保持很薄，只负责捕获 Screeps 运行时边界并调用 kernel。

`src/runtime/` 拥有对 Screeps 全局对象的直接访问权。策略模块应从该边界接收明确输入，而不是自行读取全局对象。

`src/kernel/` 拥有 tick 级编排。当前实现记录 tick telemetry，并把 runtime 快照交给 spawning 边界产出可测试的 spawn decision。

`src/memory/` 负责原始 `Memory` 的校验、schema version、迁移入口和写回。当前 schema 只有项目 root 与 `schemaVersion`，在 creep、room、spawn 状态进入前先建立单一持久化边界。

`src/spawning/` 拥有 spawn 决策。当前只有第一个 initial worker 的纯 decision，不直接调用 `spawnCreep`。

其他未来领域模块应围绕 Screeps 概念划分，例如 colony、creeps、logistics、pathing、defense、market。领域模块产出决策或 action request；最终 Screeps action 由一个运行时拥有的操作统一裁决和执行。

CPU 和 bucket 行为是架构的一部分。Pathfinding、room scan、market scan、cache rebuild 在实现前必须明确预算、执行频率和低 bucket 行为。

## 测试层

| 层级        | 目录                | 用途                                             |
| ----------- | ------------------- | ------------------------------------------------ |
| Unit        | `test/unit/`        | 通过公开 TypeScript 接口验证纯行为               |
| Integration | `test/integration/` | 在边界 stub Screeps 全局对象，验证源码级模块协作 |
| System      | `test/system/`      | 验证脚本、包管理器等项目级契约                   |
| E2E         | `test/e2e/`         | 通过 `dist/main.js` 验证编译后 bundle 执行       |

## 扩展规则

新的游戏系统必须以垂直切片进入：

1. 定义公开行为。
2. 添加一个失败测试。
3. 实现能让测试通过的最小代码。
4. 只在测试变绿后重构。
5. 当切片改变项目语言或架构时，同步更新文档或 ADR。
