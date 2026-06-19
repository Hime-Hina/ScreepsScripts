# RCL3 minimal tower policy implementation plan

## RED tests

- Tower attacks hostiles before healing/repairing.
- Tower heals wounded owned creeps when no hostile target exists.
- Tower repair is conservative and skips low-energy towers.
- Worker refill includes tower only after spawn/extensions remain safe.

## GREEN implementation

1. Add a pure tower planner from captured room/tower snapshots.
2. Add runtime capture and execution for tower actions.
3. Wire planner into `runTick` after defense capture and before/with worker refill decisions as appropriate.
4. Keep logs/diagnostics bounded.

## Verification

```bash
pnpm vitest run test/unit/defense/defense-planner.test.ts test/unit/creeps/worker-decision.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-20-rcl3-minimal-tower-policy
```
