# RCL2 extension planner decisions

## Goal

新增纯 construction planner，基于 room snapshot 为 RCL2 owned room 规划缺失的 extension construction site。

## Parent

- `.trellis/tasks/06-12-rcl2-economic-infrastructure-loop`

## Dependencies

- 可与 `06-12-rcl2-worker-energy-flow-decisions` 并行开发。
- 不依赖 runtime integration 子任务。
- 不修改 `src/runtime/screeps-runtime.ts`、`src/kernel/run-tick.ts`、integration/e2e 测试；这些由 `06-12-rcl2-runtime-integration-live-verification` 集成。

## Requirements

- 新增 `src/construction/` 纯规划模块。
- Public interface: `planRoomConstruction`.
- 输入包含 owned room、controller level、spawn position、terrain/occupancy、existing extension 和 extension construction site。
- RCL2 目标为 5 个 extension；已有 structure/site 要计入总数。
- 首版使用 spawn 周边 deterministic candidate list。
- 不在 source、controller、spawn、已有结构、已有 construction site、wall tile 上规划。

## Acceptance Criteria

- [x] Unit tests 覆盖 RCL2 缺 5 个 extension 时生成 5 个 site decisions。
- [x] Unit tests 覆盖已有 extension/site 时只补齐缺口。
- [x] Unit tests 覆盖 occupied/wall/source/controller/spawn tile 被跳过。
- [x] Unit tests 覆盖 RCL1 不规划 extension。
- [x] `pnpm test:unit -- test/unit/construction` 通过。

## Out of Scope

- Runtime `Room.createConstructionSite` 执行。
- Road/container/rampart/tower planning。
- Distance transform、floodfill、min-cut、full base layout。
