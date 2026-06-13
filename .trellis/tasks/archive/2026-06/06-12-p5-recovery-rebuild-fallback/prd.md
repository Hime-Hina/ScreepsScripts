# P5 recovery and rebuild fallback

## Goal

设计 fallen room / spawn missing / trapped 状态的恢复兜底，让系统能明确识别“还能自救、需要外援、当前不可自动恢复”的边界，并为未来多房间 rebuild 提供可验证契约。

## Parent

- `.trellis/tasks/06-12-survival-fallback-roadmap-p0-p5`

## Dependencies

- P0 controller downgrade guard live。
- P3 defense facts and P4 monitor/error signal available。
- 多房间自动 rebuild 依赖至少一个可支援 owned room；当前单房情况下只能输出诊断和 blocked recovery reason。

## Requirements

1. Recovery state detection
   - 识别 owned room 状态：healthy、degraded、spawnMissing、creepless、controllerLost、rebuildBlocked。
   - 状态必须来自 snapshot 和 live facts，不使用 hard-coded live object id。

2. Single-room fallback
   - 如果 spawn 存在但 creep 数不足，交给 P1/P0 emergency spawn/worker 保活。
   - 如果 spawn 消失且没有其他 owned room，输出 `rebuildBlocked` diagnostic，不伪造不可执行 action。
   - 如果 controller lost，记录 room lost，后续需要 human/manual respawn 或 future claim task。

3. Multi-room future contract
   - 当存在支援房时，未来可以生成 rebuild request：spawn builder/claimer/hauler 到 fallen room。
   - P5 规划该 request contract，但不在当前单房阶段实现跨房路径/claim。

4. Trapped/stagnation detection
   - 记录长期单房停滞、邻房敌对/保留、无法扩张等 signal 的设计。
   - 不在 P5 初版做扩张或进攻。

## Acceptance Criteria

- [x] Unit tests 覆盖 healthy/degraded/spawnMissing/creepLess/controllerLost/rebuildBlocked 状态分类。
- [x] Unit tests 覆盖单房无 spawn 时不产出无法执行 action。
- [x] Multi-room request contract 未在当前单房阶段实现；未来生成 rebuild request 前必须补充支援房 unit tests。
- [x] Integration tests 或 system tests 覆盖 live/read-only room recovery summary。
- [x] Docs 记录当前单房 recovery blocker。
- [x] `pnpm check` 通过。

## Out of Scope

- 实际跨房 pathfinding。
- 自动 claim/unclaim。
- 进攻、围城、拆敌建筑。
- Terminal emergency/rebuild/evacuate 实现。
- 自动购买资源/market。

## References

- TooAngel：无 spawn 时从其他房间调用 `nextroomer` build up room；有 trapped detection。
- Overmind：terminal emergency/rebuild/evacuate states；fully automatic operation includes expansion/recovery in mature architecture.
- Screeps API：claim/reserve/build/spawn 的实际能力受 GCL、room visibility、TTL 和 pathing 限制。
