# P0 controller downgrade guard

## Goal

在 RCL2 房间建设 extension 的同时，显式处理 controller downgrade 风险：读取 `controller.ticksToDowngrade`，当 downgrade timer 低于安全阈值时抢占 build，让满能 worker 优先 upgrade controller，避免房间降级。

## Parent

- `.trellis/tasks/06-12-survival-fallback-roadmap-p0-p5`

## Dependencies

- 无前置实现依赖；这是 P0-P5 的第一实施任务。
- 不应与 P1/P2/P3/P4 同时修改 `src/runtime/screeps-runtime.ts`、`src/kernel/run-tick.ts`、`src/creeps/worker-decision.ts` 或 `test/integration/main-loop.test.ts`。

## Confirmed Facts

- 用户观察到 controller UI 显示 `Downgrade in: 6203`。
- 当前 `src/runtime/screeps-runtime.ts` 捕获 controller 时只保存 `id` 和 `roomName`，未读取 `ticksToDowngrade`。
- 当前 worker priority 是 harvest -> refill energy structure -> build construction site -> upgrade controller。
- 当前 RCL2 extension sites 总成本高，若 build 长期优先于 upgrade，会有 downgrade 风险。

## Requirements

1. Runtime snapshot
   - Captures owned controller `ticksToDowngrade` and controller level.
   - Does not use hard-coded room/controller IDs.
   - Keeps Screeps globals inside runtime boundary.

2. Controller safety contract
   - Introduce an explicit downgrade safety state, not a boolean flag or mode string.
   - Suggested states:
     - `controllerDowngradeSafe`
     - `controllerDowngradeRecovering`
     - `controllerDowngradeWarning`
     - `controllerDowngradeCritical`
   - Initial thresholds should be conservative for RCL2:
     - Warning below `8000`: at least one full-energy worker upgrades before build.
     - Critical below `5000`: all full-energy workers upgrade until out of critical range.
     - Recovering below `9000`: at least one full-energy worker keeps upgrading before build.
     - Safe at `9000+`: normal build priority may resume.

3. Worker priority
   - Empty workers still harvest.
   - Spawn/extension refill still outranks upgrade.
   - Under recovering/warning/critical state, upgrade outranks build.
   - When safe, current build-before-upgrade behavior remains.

4. Runtime execution
   - Continue using existing `upgradeController` runtime action.
   - Existing out-of-range movement still applies.

5. Documentation and live verification
   - Docs should record that controller downgrade is actively guarded.
   - If deployed, live readback should record `ticksToDowngrade` and whether it is moving toward safe threshold.

## Acceptance Criteria

- [x] Unit tests cover safe state: worker builds before upgrade when construction exists.
- [x] Unit tests cover recovering state: one full-energy worker upgrades before build until `9000+`.
- [x] Unit tests cover warning state: one full-energy worker upgrades before build.
- [x] Unit tests cover critical state: all full-energy workers upgrade before build.
- [x] Unit tests cover refill still outranks downgrade upgrade.
- [x] Integration tests prove runtime captures `ticksToDowngrade`.
- [x] Existing RCL2 refill/build/upgrade tests remain passing.
- [x] `pnpm check` passes.
- [x] If deployed, `pnpm deploy:screeps` and `pnpm verify:live:screeps` pass, and `docs/game-state.md` records live downgrade readback.

## Out of Scope

- P1 construction backpressure beyond downgrade safety.
- Opportunistic energy pickup/withdraw.
- Repair、defense、safe mode、CPU degraded mode。
- Long-term Memory hysteresis; P0 may use stateless thresholds first.

## References

- Screeps official API: `StructureController.ticksToDowngrade`, `Creep.upgradeController`.
- Mature bot pattern: urgent upgrader / downgrade guard preempts ordinary construction.
