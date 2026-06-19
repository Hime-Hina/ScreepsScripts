# Priority bootstrap/RCL3 spawn requests implementation plan

## RED tests

- Survival request beats development request.
- Safe RCL3 development request is represented with target gap and reason metrics.
- Unaffordable high-capability body falls back to affordable body option.
- Stable tie-breaking across multiple requests/spawns.
- No request when all target gaps are satisfied.

## GREEN implementation

1. Introduce explicit request interfaces in `src/spawning/spawn-decision.ts`.
2. Convert existing survival/development internals to request records.
3. Keep `SpawnDecision` public behavior stable.
4. Add test fixtures for future TTL/role tasks without implementing those tasks.

## Verification

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts test/unit/colony/bootstrap-economy.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-18-priority-bootstrap-spawn-requests
```
