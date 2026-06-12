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

1. Construction backpressure
   - worker 只有在 controller downgrade safe、spawn/extension refill stable、worker count stable 时才 build construction site。
   - build target 必须可以被明确暂停；暂停时 worker 应进入 refill/upgrade/harvest，不空转。
   - 不通过 `mode` / `flag` / options 参数切换 build 行为；使用明确的 room economy decision 或 priority contract。

2. Opportunistic energy
   - worker 采能优先考虑同房间可用 dropped energy、tombstone/ruin/store 里的 energy，再 harvest source。
   - 不读取 hostile/unknown structure 作为默认 withdraw 目标，除非该行为在测试中单独建模。
   - 没有 opportunistic energy 时保持现有 source assignment。

3. Target reservation
   - 同一 tick 内多个 worker 不应全部选择同一个 dropped energy、tombstone、construction site 或 energy structure，除非目标容量足够且 contract 明确。
   - reservation 是 per-tick planning 输出，不引入长期 Memory 状态。

4. Universal worker continuity
   - RCL1-2 继续使用通用 worker/pioneer 思路：同一 worker 可 harvest/refill/build/upgrade。
   - 不拆出 dedicated miner/hauler，直到 container/storage 或更高 RCL task 单独批准。

## Acceptance Criteria

- [ ] Unit tests 覆盖 build paused when room economy is unsafe。
- [ ] Unit tests 覆盖 opportunistic energy target before source harvest。
- [ ] Unit tests 覆盖 target reservation 避免同 tick 多 worker 抢同一小目标。
- [ ] Integration tests 证明 runtime 捕获 dropped/tombstone/ruin/store energy 并只通过 boundary 执行 pickup/withdraw。
- [ ] Existing refill/build/upgrade 行为仍通过。
- [ ] `pnpm check` 通过。
- [ ] 若部署，`docs/game-state.md` 记录 live readback：construction progress 不再牺牲 controller safety。

## Out of Scope

- Controller downgrade guard 本身。
- Repair、tower、safe mode、防御。
- Dedicated miner/hauler、container mining、remote mining。
- 多房经济调度。

## References

- KasamiBot: RCL1-2 使用 pioneer 同时 harvest、supply、construction、upgrade。
- Overmind: workers 会从 dropped energy 等更智能 recharge target 获取能量。
- Screeps API: `pickup`, `withdraw`, `Creep.build`, `Creep.upgradeController`。
