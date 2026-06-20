# Bootstrap/RCL3 TTL replacement pressure implementation plan

## RED tests

- A room at target worker count but with one worker below replacement TTL emits a replacement/development request.
- A room with all workers above the TTL window emits no replacement request.
- A spawning worker reduces the replacement gap when represented in the snapshot.
- Survival-under-floor still wins over replacement.

## GREEN implementation

1. Extend worker/spawning snapshots with TTL/spawning fields only as needed.
2. Add replacement-pressure calculation in the request target-gap layer.
3. Keep public `SpawnDecision` execution unchanged.

## Verification

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-18-bootstrap-ttl-replacement-pressure
```
