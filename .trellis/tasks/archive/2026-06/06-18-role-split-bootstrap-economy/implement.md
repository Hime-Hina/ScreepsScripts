# Role-split container logistics implementation plan

## RED tests

- With source containers present and empty, role demand requests miners before discretionary builders/upgraders.
- Hauler requests appear when source containers have energy or sources need collection capacity.
- Builder demand follows construction backlog but does not starve survival/refill.
- Upgrader demand is bounded and uses controller logistics when available.
- Emergency universal request still appears below survival floor.

## GREEN implementation

1. Extend spawn request types for role-specific demand.
2. Add role snapshots/intent fields only as needed for deterministic planning.
3. Implement minimal role action planning around existing containers.
4. Preserve existing generic worker behavior as fallback during migration.

## Verification

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts test/unit/creeps/worker-decision.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-18-role-split-bootstrap-economy
```
