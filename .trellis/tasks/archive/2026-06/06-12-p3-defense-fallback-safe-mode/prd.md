# P3 defense fallback and safe mode

## Goal

建立最小 defense fallback：识别敌对威胁、在核心结构受威胁时触发 safe mode、为 RCL3 tower policy 留出清晰边界，避免房间在无人值守时被攻击打断经济循环。

## Parent

- `.trellis/tasks/06-12-survival-fallback-roadmap-p0-p5`

## Dependencies

- P0 controller downgrade guard live。
- P1 economic fallback live。
- P2 可并行研究，但 runtime/kernel 集成不能同时开发。

## Requirements

1. Threat detection
   - runtime 捕获 hostile creeps 的 owner、body parts、hits、position。
   - 初版只区分 canDamage、canHeal、canDismantle、nearCore，不做完整 combat simulator。
   - Hostile spawn/tower 读回可作为 room risk fact，不作为 RCL2 直接行动目标。
   - hostile body power 判断应使用 Screeps official constants，例如 `ATTACK_POWER`、`RANGED_ATTACK_POWER`、`DISMANTLE_POWER`、`HEAL_POWER`，不维护第二份 combat power 表。

2. Safe mode trigger
   - 当 hostile 有攻击/拆除能力且接近 spawn/关键结构，且 controller 可用 safe mode 时，产出 `activateSafeMode` decision。
   - `activateSafeMode` 只在 runtime boundary 执行。
   - 不在测试不足时自动触发 safe mode 于所有 hostile；避免浪费 safe mode charge。

3. Tower policy skeleton
   - RCL3 tower 解锁后，tower 优先级为 attack immediate threat -> heal own damaged creep -> repair critical structure。
   - P3 可先实现纯 tower decision 或只写设计，具体取决于 live RCL。
   - tower 攻击、治疗、维修、falloff/range 判断必须从 Screeps official tower constants 派生，例如 `TOWER_POWER_ATTACK`、`TOWER_POWER_HEAL`、`TOWER_POWER_REPAIR`、`TOWER_OPTIMAL_RANGE`、`TOWER_FALLOFF_RANGE`、`TOWER_FALLOFF`。

4. Energy preservation under threat
   - 有威胁时 P1/P2 应能收到 room unsafe signal，暂停非关键 build/repair。

## Acceptance Criteria

- [ ] Unit tests 覆盖 hostile harmless scout 不触发 safe mode。
- [ ] Unit tests 覆盖 hostile attack/dismantle near spawn 触发 safe mode decision。
- [ ] Unit tests 覆盖 hostile damage/heal/dismantle 判断使用 captured official body-part power constants。
- [ ] Integration tests 证明 runtime 捕获 hostile body/position 并执行 `controller.activateSafeMode`。
- [ ] 如果实现 tower skeleton，unit tests 覆盖 tower attack > heal > repair，且 tower power/range/falloff 使用 captured official constants。
- [ ] Existing P1/P2 worker economy 行为保持通过。
- [ ] `pnpm check` 通过。

## Out of Scope

- Offensive combat。
- Defender spawning。
- Pathfinding/kiting/combat formation。
- Boosting/lab logic。
- Full threat scoring simulator。

## References

- Screeps API：`StructureController.activateSafeMode`、tower attack/heal/repair。
- Overmind：safe mode and invasionDefense triggers；tower targeting evolves from simple to threat-filtered.
- Maturity Matrix：tower defense should progress from first-found to threat filtering; advanced damageable/spread firing is not P3 scope.
