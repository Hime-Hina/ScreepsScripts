# P1 economic fallback and construction backpressure

## Goal

在 P0 controller 保级已完成后，为 RCL2 bootstrap 经济增加建设预算、能量回收和 per-tick target 分配兜底，避免 extension construction 长期吞噬保活能量。

## Parent

- `.trellis/tasks/06-12-survival-fallback-roadmap-p0-p5`

## Dependencies

- 必须先完成或确认已 live：P0 controller downgrade guard。
- 不依赖 P2/P3/P4/P5。
- 代码实现时不应与 P2/P3/P4 同时改 `src/runtime/screeps-runtime.ts`、`src/kernel/run-tick.ts` 或 `src/creeps/worker-decision.ts`。

## Requirements

1. Official constants for economic limits
   - P1 touched logic must use Screeps runtime constants for game rules instead of duplicating official numeric tables.
   - RCL structure limits should come from `CONTROLLER_STRUCTURES`.
   - Construction backlog/cost should come from `CONSTRUCTION_COST`.
   - Spawn body cost should come from `BODYPART_COST`.
   - P1 must not replace strategic thresholds such as P0 downgrade warning ticks with official constants when those thresholds are project policy rather than game rules.

2. Memory hygiene
   - Clean stale top-level `Memory.creeps` entries for names absent from `Game.creeps`.
   - Cleanup belongs at the runtime/memory boundary, not inside worker/spawn strategy modules.
   - Existing project memory root `Memory.screepsScripts` remains schema-owned and must not be mixed with legacy Screeps creep memory.
   - Cleanup must be observable in unit/integration tests and must not delete live creep entries.

3. Construction backpressure
   - worker 只有在 controller downgrade safe、spawn/extension refill stable、worker count stable 时才 build construction site。
   - build target 必须可以被明确暂停；暂停时 worker 应进入 refill/upgrade/harvest，不空转。
   - 不通过 `mode` / `flag` / options 参数切换 build 行为；使用明确的 room economy decision 或 priority contract。

4. Bootstrap worker population
   - RCL2 bootstrap worker 目标从当前硬上限 `3` 提高到 `5`，以覆盖 P0 保级 upgrade、spawn/extension refill、source harvest 和 extension construction 并发需求。
   - worker 增量必须受明确经济安全条件约束：不能在 spawn/extension 长期缺能、controller downgrade 非 safe 或已有 spawn 正在 spawning 时盲目排队。
   - 不引入 dedicated miner/hauler；仍使用 RCL1-2 通用 worker。
   - 不把 `3 -> 5` 做成孤立魔法数补丁；目标数量应属于 P1 经济/人口 contract，并由单元测试覆盖。

5. Opportunistic energy
   - worker 采能优先考虑同房间可用 dropped energy、tombstone/ruin/store 里的 energy，再 harvest source。
   - 不读取 hostile/unknown structure 作为默认 withdraw 目标，除非该行为在测试中单独建模。
   - 没有 opportunistic energy 时保持现有 source assignment。

6. Target reservation
   - 同一 tick 内多个 worker 不应全部选择同一个 dropped energy、tombstone、construction site 或 energy structure，除非目标容量足够且 contract 明确。
   - reservation 是 per-tick planning 输出，不引入长期 Memory 状态。

7. Universal worker continuity
   - RCL1-2 继续使用通用 worker/pioneer 思路：同一 worker 可 harvest/refill/build/upgrade。
   - 不拆出 dedicated miner/hauler，直到 container/storage 或更高 RCL task 单独批准。

## Acceptance Criteria

- [x] Unit tests 覆盖 build paused when room economy is unsafe。
- [x] Unit/integration tests 覆盖 stale `Memory.creeps` cleanup：不存在于 `Game.creeps` 的 name 被删除，仍存在的 name 保留。
- [x] Unit/integration tests 覆盖 P1 经济/孵化/建造规则从 Screeps constants capture 派生，而不是维护第二份数字表。
- [x] Unit tests 覆盖 RCL2 bootstrap worker target `5`：`workerCreepCount < 5` 时继续 spawn，`>= 5` 时停止。
- [x] Unit tests 覆盖 worker population growth does not bypass controller downgrade safety/economic unsafe state。
- [x] Unit tests 覆盖 opportunistic energy target before source harvest。
- [x] Unit tests 覆盖 target reservation 避免同 tick 多 worker 抢同一小目标。
- [x] Integration tests 证明 runtime 捕获 dropped/tombstone/ruin/store energy 并只通过 boundary 执行 pickup/withdraw。
- [x] Existing refill/build/upgrade 行为仍通过。
- [x] `pnpm check` 通过。
- [x] 若部署，`docs/game-state.md` 记录 live readback：construction progress 不再牺牲 controller safety。

## Out of Scope

- Controller downgrade guard 本身。
- Repair、tower、safe mode、防御。
- Dedicated miner/hauler、container mining、remote mining。
- 多房经济调度。

## References

- KasamiBot: RCL1-2 使用 pioneer 同时 harvest、supply、construction、upgrade。
- Overmind: workers 会从 dropped energy 等更智能 recharge target 获取能量。
- Screeps API: `pickup`, `withdraw`, `Creep.build`, `Creep.upgradeController`。
