# P2 structure maintenance and repair fallback

## Goal

在 P1 经济预算完成后，加入最小 critical repair 能力，确保 spawn/extension/container/road 等关键结构不会因 decay 或攻击后的低 hits 影响房间自持。

## Parent

- `.trellis/tasks/06-12-survival-fallback-roadmap-p0-p5`

## Dependencies

- P0 controller downgrade guard live。
- P1 construction backpressure live，避免 repair 与 build/upgrade 抢占保命能量。
- 不与 P1/P3/P4 同时修改 runtime/kernel/worker 集成文件。

## Requirements

1. Critical repair target model
   - runtime 捕获 owned room 结构的 `id/type/hits/hitsMax/roomName/pos`。
   - repair target 只包含当前任务明确支持的结构。
   - 初版优先 spawn、extension、container、road；rampart/wall 只允许作为 newborn/critical low hits 后续切片。
   - repair 阈值、结构 hits 相关规则应从 Screeps official constants 或 runtime `hitsMax` 派生，不在 P2 策略中维护第二份 structure hits 数字表。

2. Worker repair action
   - worker 有能量、没有 urgent refill/P0 upgrade、且 repair target critical 时执行 repair。
   - repair 优先级必须高于 ordinary build，但低于 spawn/extension refill 和 P0 controller safety。
   - repair action 通过 runtime boundary 执行 `creep.repair(target)`。

3. Maintenance gating
   - 不新增 road/container planner，除非 repair 行为已通过。
   - 若 road/container 已存在，维护阈值必须保守，避免在 RCL2 透支能量。

## Acceptance Criteria

- [ ] Unit tests 覆盖 critical spawn/extension repair before build。
- [ ] Unit tests 覆盖 non-critical damaged road 不抢占 build/upgrade。
- [ ] Unit tests 覆盖 unsupported wall/rampart 不进入 P2 repair target。
- [ ] Unit tests 覆盖 repair critical threshold 使用 captured official structure constants 或 runtime `hitsMax`，不硬编码 spawn/extension/road hits。
- [ ] Integration tests 证明 runtime 捕获 structure hits 并执行 `creep.repair`。
- [ ] Existing refill/build/upgrade/P1 行为保持通过。
- [ ] `pnpm check` 通过。

## Out of Scope

- 新建 roads/containers。
- rampart/wall fortification。
- tower repair。
- hostile combat response。
- full janitor/basebuilder role system。

## References

- KasamiBot：janitor 负责 roads/containers repair，basebuilder 负责 build 和 wall/rampart upkeep。
- Overmind：低 RCL critical rampart/repair 有特殊优先级，但本任务不引入 rampart 策略。
- Screeps API：`Creep.repair(target)` 需要 WORK/CARRY energy。
