# RCL2 runtime integration and live verification

## Goal

在前两个纯决策子任务完成后，把 construction planner 与 worker energy-flow 接入 runtime/kernel，跑完整测试，并在批准后部署 live。

## Parent

- `.trellis/tasks/06-12-rcl2-economic-infrastructure-loop`

## Dependencies

- 必须在以下子任务完成或其补丁可集成后开始：
  - `06-12-rcl2-worker-energy-flow-decisions`
  - `06-12-rcl2-extension-planner-decisions`

## Requirements

- Runtime 捕获 energy structures、construction sites、owned room construction snapshot。
- Runtime 执行：
  - `createConstructionSite`
  - `refillEnergyStructure`
  - `buildConstructionSite`
- Kernel tick 顺序接入 construction planner、spawn planner、worker planner。
- Integration/e2e tests 覆盖 create site、refill extension、build site。
- Docs 更新 README、CONTEXT、architecture/development/game-state。
- 如果 live deploy 执行，记录 API readback 和 room state。

## Acceptance Criteria

- [x] `pnpm check` 通过。
- [x] `pnpm test:screeps-server` 通过或记录具体 blocker。
- [x] `pnpm deploy:screeps` 和 `pnpm verify:live:screeps` 在批准后通过。
- [x] `docs/game-state.md` 记录 extension sites/structures 读回或 blocked reason。

## Out of Scope

- 改动前两个子任务已经完成并验证的纯决策行为，除非集成发现契约缺陷。
- Road/container/repair/tower。
