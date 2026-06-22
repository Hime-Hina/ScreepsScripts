# Implementation plan

## RED

1. Add a spawning regression for the live W51N21 role drift:
   - RCL4, full source containers, storage construction backlog, low road hits represented by repair targets if available in snapshot context, 17 miners + 1 hauler, 0 builder/upgrader.
   - One miner is expiring.
   - Expected first request: `builderWorker`, not `minerWorker`.
2. Add a replacement regression:
   - miner target is 2, miner count is far above target, expiring miners exist, no missing role targets.
   - Expected: no miner replacement.
3. Preserve a positive replacement case for a role exactly at target with one expiring member.
4. Run focused tests and confirm expected failures.

## GREEN

1. Extend `RoleTarget` with a bounded `allowPopulationSurplus` flag for builder/upgrader recovery, not just hauler logistics.
2. Change replacement logic from `count >= target && expiring > 0` to `count - expiring < target`.
3. Keep request priority ordering intact: miner > hauler > builder > upgrader, but missing-role gap selection runs before replacement.
4. Run focused tests until green.

## VERIFY

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts
pnpm check
git diff --check
python3 .trellis/scripts/task.py validate 06-22-06-22-role-rebalance-repair-recovery
```

## Deploy gate

User authorized code fix + tests + deploy + short monitoring for this incident.
