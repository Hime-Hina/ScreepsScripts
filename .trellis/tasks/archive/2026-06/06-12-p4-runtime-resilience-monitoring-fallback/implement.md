# P4 runtime resilience and monitoring fallback implementation plan

## Checklist

- [x] Confirm P0 and P1 survival signals exist.
- [x] Add CPU snapshot capture to runtime interface.
- [x] Add pure budget decision tests.
- [x] Add kernel branch for survival-only budget.
- [x] Add alert decision and throttling tests.
- [x] Add runtime `Game.notify` execution with group interval.
- [x] Add operation-group error boundary tests.
- [x] Add local official server e2e case for runtime monitor natural tick evidence.
- [x] Add read-only live survival check script or extend existing script.
- [x] Add system tests for script contract and no default CI inclusion.
- [x] Update docs/game-state and development docs.
- [x] Run validation commands.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/kernel test/unit/runtime
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:system
node scripts/screeps-server/run-suite.mjs case runtime-resilience-monitoring
pnpm check
pnpm verify:live:screeps
```

`verify:live:screeps` remains readback only. The new live survival check must be explicit and read-only. The local server case is explicit, credential-free, and remains outside default `pnpm check`.

## Validation Results

- `pnpm check` passed.
- `node scripts/screeps-server/run-suite.mjs case runtime-resilience-monitoring` passed and observed a natural local engine heartbeat with CPU snapshot and room survival summary.
- `pnpm deploy:screeps` passed and deployed live branch `main` with module set hash `5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`.
- `pnpm verify:live:screeps` passed with `apiReadback=main-matched` for hash `5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`.
- `pnpm status:live:screeps` passed and printed the read-only live survival summary for `shard1 / W51N21`.

## Risk Points

- Error isolation can hide real defects if logs are vague.
- Game.notify can spam if throttling is wrong.
- Low-bucket mode must never skip P0 controller upgrade or emergency spawn.

## Parallelization

Live-check script, local server runner case, and CPU budget pure tests can be delegated. Kernel/runtime integration should be single-owner.
