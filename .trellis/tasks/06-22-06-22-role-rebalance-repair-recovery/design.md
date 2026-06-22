# Design: role rebalance and repair recovery

## Root cause

The previous role-composition safety fix allowed missing haulers to bypass the generic population cap during a logistics outage, but builder/upgrader gaps remained blocked when total population was already above target.

The replacement logic also replaced any expiring role when `count(role) >= target(role)`. In a miner-heavy room this perpetuates surplus miners forever:

```text
miner count 17, miner target 2, expiring miners > 0 -> request minerWorker
builder target 2, count 0, genericTargetGap 0 -> no builder request
upgrader target 1, count 0, genericTargetGap 0 -> no upgrader request
```

## Target behavior

### Missing-role recovery above generic cap

Allow role-gap requests above the generic cap for role targets that are needed for role composition recovery:

- `haulerWorker`: already allowed for concrete logistics outage.
- `builderWorker`: allowed when builder target is positive and current builder count is below target.
- `upgraderWorker`: allowed when upgrader target is positive and current upgrader count is below target.

The surplus bypass remains bounded by each role's target gap; it does not request unbounded workers.

### Replacement only for post-expiry deficits

A role replacement is valid only when currently healthy role count after expiring creeps would fall below that role's target:

```text
healthyRoleCount = roleCount - expiringRoleCount
if healthyRoleCount < roleTarget -> replacement allowed
else no replacement
```

This preserves replacement for at-target roles while allowing surplus miners to age out.

## Scope

- Edit `src/spawning/spawn-decision.ts` only.
- Add/update tests in `test/unit/spawning/spawn-decision.test.ts`.
- No runtime Memory migration, manual role rewrite, or console write.
