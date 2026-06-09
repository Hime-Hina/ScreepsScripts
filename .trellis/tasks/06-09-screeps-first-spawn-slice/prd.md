# 实现第一个 spawn 行为切片

## Goal

给定已有 spawn 且没有 creep，tick 产生第一个 spawn decision，并通过测试验证。

## Confirmed Facts

- 当前项目没有 spawn/creep 策略模块。
- `Memory` 边界必须先完成，避免 spawn/creep 状态散落。
- 用户明确要求第一个切片极小，不做完整经济系统。

## Requirements

- 前置条件：生产初始状态已记录，`Memory` 边界已完成。
- 给定已有 spawn 且没有 creep，一个 tick 应产生一个可测试的 spawn decision。
- 决策至少可验证 body、name、日志或 action request 中的一项；优先使用返回 typed decision 或 runtime action request。
- 不执行完整 creep 工作流、不实现经济系统、不添加 role folder 架构。
- 决策所有者应放在 spawning/colony 等正确领域边界中，不放在 `src/main.ts`。

## Acceptance Criteria

- [ ] 有一个失败优先的行为测试表达 Given spawn exists and no creeps / When tick runs / Then spawn decision exists。
- [ ] 生产代码只实现该切片需要的最小决策。
- [ ] 测试不 mock 内部 strategy 模块，只 mock Screeps/runtime 边界。
- [ ] docs/architecture 或 specs 在引入新领域边界时同步。
- [ ] focused tests 和 `pnpm check` 通过。

## Notes

- 本任务产出 decision/action request；是否真实调用 `spawnCreep` 只有在设计中确认边界后才实现。
