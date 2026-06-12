# RCL2 worker energy-flow decisions

## Goal

在纯 worker decision 层引入 RCL2 能量流优先级：worker 满能量后先补 spawn/extension，再 build construction site，最后 upgrade controller。

## Parent

- `.trellis/tasks/06-12-rcl2-economic-infrastructure-loop`

## Dependencies

- 可与 `06-12-rcl2-extension-planner-decisions` 并行开发。
- 不依赖 runtime integration 子任务。
- 不修改 `src/runtime/screeps-runtime.ts`、`src/kernel/run-tick.ts`、integration/e2e 测试；这些由 `06-12-rcl2-runtime-integration-live-verification` 集成。

## Requirements

- 扩展 `WorkerWorldSnapshot`，加入同房间 energy structures 和 construction sites 的纯数据。
- 用 `refillEnergyStructure` 替代 spawn-only refill 概念。
- 新增 `buildConstructionSite` decision。
- worker action priority:
  1. 有 free capacity 时 harvest assigned source。
  2. 有 energy 且同房间 energy structure 未满时 refill。
  3. 有 energy 且同房间 construction site 存在时 build。
  4. 有 energy 且 controller 存在时 upgrade。
- 保持现有多 source 确定性分配。

## Acceptance Criteria

- [x] Unit tests 覆盖 spawn/extension refill priority。
- [x] Unit tests 覆盖 build before upgrade。
- [x] Unit tests 覆盖 no construction site 时继续 upgrade。
- [x] Unit tests 覆盖空包 harvest assignment 不回退。
- [x] `pnpm test:unit -- test/unit/creeps/worker-decision.test.ts` 通过。

## Out of Scope

- Runtime action execution。
- Room.createConstructionSite。
- Extension placement。
- Road/container/repair/tower。
