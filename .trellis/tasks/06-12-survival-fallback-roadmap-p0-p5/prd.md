# Survival fallback roadmap P0-P5

## Goal

把 P0-P5 保活、兜底策略拆成可独立规划、顺序实施、可验证的 Trellis 子任务。该父任务不直接实现代码；它约束各子任务的顺序、边界、验收和成熟方案来源。

## User Value

- 在 RCL2 安全期内避免因建设、维护、防御或 runtime 异常导致房间死亡。
- 把成熟 bot 的经验转化为本仓库当前架构能承受的小切片，而不是一次性引入完整 colony 框架。
- 为后续并行代理开发提供明确写入范围和主线目标，避免 P0-P5 互相覆盖 runtime/kernel/worker 决策。

## Confirmed Facts

- 当前 active room 是 `shard1 / W51N21`，RCL2，`Spawn1` at `35,23`。
- 当前代码已覆盖 worker spawn、source harvest、spawn/extension refill、extension construction site、build site、upgrade fallback。
- 当前代码没有 `controller.ticksToDowngrade` 保级抢占；P0 controller downgrade guard 是本路线图第一优先级。
- 当前代码没有 dropped energy/tombstone/ruin 回收、repair、hostile detection、safe mode、tower、CPU bucket 降级、runtime alert、multi-room rebuild。
- 成熟方案参考：
  - Screeps 官方文档：controller 未被 `upgradeController` 影响会递减 downgrade timer；RCL2 timer 为 5000 tick 级别到高 RCL 更长，必须周期性 upgrade。
  - Overmind：workers 会在 downgrade imminent 时更早 upgrade/重新 spawn；低 RCL priority 会调整；有 critical bucket 暂停策略、terminal emergency/rebuild/evacuate 状态。
  - KasamiBot：RCL1-2 使用 pioneer 同时 harvest/refill/build/upgrade；basehauler 保障 extension refill；janitor 负责 road/container repair；basebuilder 负责 build 和 rampart/wall upkeep。
  - TooAngel：有 universal 保证基础能量与建造，房间无 spawn 时由其他房间 `nextroomer` 重建；有 trapped detection。
  - Screeps Maturity Matrix：hauling、tower defense、room defense、boosting 等系统应逐步成熟，不应在低 RCL 一次性铺开。

## Child Task Map

0. `06-12-p0-controller-downgrade-guard`
   - 目标：读取 `controller.ticksToDowngrade`，在 downgrade 低于安全阈值时抢占 build，至少保证一个或全部满能 worker upgrade。
   - 前置：无；应先于 P1-P5 实现。
   - 主要写入：`src/creeps/`, `src/runtime/`, integration/e2e/docs。

1. `06-12-p1-economic-fallback-construction-backpressure`
   - 目标：建设预算、能量回收、target reservation、经济兜底。
   - 前置：P0 controller downgrade guard live。
   - 主要写入：`src/creeps/`, `src/runtime/`, `src/kernel/`, unit/integration/docs。

2. `06-12-p2-structure-maintenance-repair-fallback`
   - 目标：critical repair、road/container maintenance 前置规则、repair worker action。
   - 前置：P1 construction budget，避免 repair 与 build 抢能量。
   - 主要写入：worker repair target snapshot/action、runtime repair execution、tests/docs。

3. `06-12-p3-defense-fallback-safe-mode`
   - 目标：hostile detection、safe mode trigger、tower policy 骨架。
   - 前置：P1 resource budget；RCL3 tower 细节可在 tower 解锁后完成。
   - 主要写入：`src/defense/`, runtime defense snapshot/execution、integration tests。

4. `06-12-p4-runtime-resilience-monitoring-fallback`
   - 目标：CPU/bucket degraded operation、runtime error isolation、Game.notify/console alerts、live monitor facts。
   - 前置：P1 的关键生存 signal；可与 P2/P3 做研究并行，但代码接入必须顺序。
   - 主要写入：runtime/kernel diagnostics, specs, tests, docs。

5. `06-12-p5-recovery-rebuild-fallback`
   - 目标：fallen room detection、spawn missing recovery plan、multi-room rebuild/evacuate 设计。
   - 前置：P3/P4 的 defense 和 monitoring signal；实际跨房支援依赖第二 owned room。
   - 主要写入：diagnostic/recovery planning 模块、docs、future blocked facts。

## Requirements

- 所有子任务必须坚持 runtime boundary：策略模块只读 snapshot，Screeps globals 只在 `src/runtime/`。
- 不允许以 mode/flag/options 参数切换特殊行为；生存状态必须表达为明确业务概念和 decision。
- 不允许为了 P1-P5 一次性引入完整 Overmind/Kasami/TooAngel 风格框架。
- 所有部署影响任务必须先本地 `pnpm check`、必要时 `pnpm test:screeps-server`，再 live deploy/readback。
- P0 必须先于 P1-P5 启动实现；P1-P5 设计中的 P0 前置条件由本任务树中的 P0 子任务满足。

## Acceptance Criteria

- [ ] 6 个子任务均有 `prd.md`、`design.md`、`implement.md`。
- [ ] 每个子任务都有明确前置条件、写入范围、验收标准和 out-of-scope。
- [ ] 每个子任务能被独立代理读取后不偏离主线目标。
- [ ] 父任务记录 P0-P5 顺序与可并行/不可并行边界。
- [ ] `task.py validate` 对父任务和 5 个子任务均通过。

## Out of Scope

- 直接实现 P0-P5。
- live deploy、rollback 或修改生产代码。

## Open Questions

- 无阻塞规划的问题；实现开始前仍需用户明确批准。
