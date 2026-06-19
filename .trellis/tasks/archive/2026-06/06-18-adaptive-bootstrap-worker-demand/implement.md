# Adaptive bootstrap worker demand implementation plan

## Steps

1. Update tests in `test/unit/colony/bootstrap-economy.test.ts` for dynamic target outcomes:
   - source saturation target with 2 sources and 2 WORK body reaches aggressive cap;
   - backlog target increases above survival floor;
   - W51N21-like state demands more than 5;
   - downgrade warning returns survival demand;
   - non-RCL2 returns survival demand.
2. Update spawn tests to include `sourceCount` and `workerCreepWorkParts`, then assert a 5-worker W51N21-like RCL2 room still plans another worker.
3. Verify RED focused tests.
4. Implement `BootstrapWorkerDemandInput` additions and dynamic formula in `src/colony/bootstrap-economy.ts`.
5. Compute `plannedWorkerWorkParts` in `src/spawning/spawn-decision.ts` from the largest capacity-supported worker body.
6. Capture `sourceCount` and `workerCreepWorkParts` in `src/runtime/screeps-runtime.ts` for full and survival spawning snapshots.
7. Run focused tests, `pnpm check`, `git diff --check`, and `task.py validate 06-18-adaptive-bootstrap-worker-demand`.
8. Run independent read-only review before final commit.

## Verification commands

```bash
pnpm vitest run test/unit/colony/bootstrap-economy.test.ts test/unit/spawning/spawn-decision.test.ts test/integration/main-loop.test.ts test/e2e/compiled-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-18-adaptive-bootstrap-worker-demand
```
