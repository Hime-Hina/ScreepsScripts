# P0 controller downgrade guard implementation plan

## TDD Planning Gate

Public interface under test:

- Unit: `planBootstrapWorkerActions(workerWorld)` from `src/creeps/worker-decision.ts`.
- Integration: `loop()` from `src/main.ts`, through `captureScreepsTickRuntime()` and `runScreepsTick()`.
- Bundle smoke: exported `loop` from `dist/main.js`.

Mock boundaries:

- Unit tests pass typed `WorkerWorldSnapshot` objects directly; do not mock private worker helpers.
- Integration tests stub Screeps globals only at the runtime boundary: `Game`, `Memory`, Screeps constants, `console`, and object methods such as `Creep.upgradeController`.
- Do not mock `planBootstrapWorkerActions`, `runScreepsTick`, or runtime execution methods in integration tests.

Observable behavior slices:

1. Safe controller
   - Given a full-energy worker, full spawn/extension energy, one construction site, and controller `ticksToDowngrade >= 9000`.
   - When `planBootstrapWorkerActions` runs.
   - Then the worker emits `buildConstructionSite`.

2. Recovering controller
   - Given two full-energy workers, full spawn/extension energy, one construction site, and controller `ticksToDowngrade` in `[8000, 9000)`.
   - When `planBootstrapWorkerActions` runs.
   - Then the first worker by name emits `upgradeController`, and later workers may build.

3. Warning controller
   - Given two full-energy workers, full spawn/extension energy, one construction site, and controller `ticksToDowngrade` in `[5000, 8000)`.
   - When `planBootstrapWorkerActions` runs.
   - Then the first worker by name emits `upgradeController`, and later workers may build.

4. Critical controller
   - Given multiple full-energy workers, full spawn/extension energy, one construction site, and controller `ticksToDowngrade < 5000`.
   - When `planBootstrapWorkerActions` runs.
   - Then every full-energy worker in that room emits `upgradeController`.

5. Refill priority
   - Given a full-energy worker, a depleted spawn or extension, one construction site, and a non-safe controller.
   - When `planBootstrapWorkerActions` runs.
   - Then the worker emits `refillEnergyStructure`.

6. Runtime capture
   - Given an owned room controller with `level` and `ticksToDowngrade` in the stubbed Screeps globals.
   - When `loop()` runs.
   - Then worker decisions receive the captured controller fields and execute `upgradeController` against the runtime-resolved controller object.

## Checklist

- [x] Read parent `prd.md`, `design.md`, and P0 `design.md`.
- [x] Add failing unit test: safe controller keeps build before upgrade.
- [x] Add controller `level` and `ticksToDowngrade` to worker snapshot contract.
- [x] Add failing unit test: recovering controller keeps one full-energy worker upgrading until `9000+`.
- [x] Add failing unit test: warning controller makes one full-energy worker upgrade before build.
- [x] Add failing unit test: critical controller makes all full-energy workers upgrade before build.
- [x] Add failing unit test: refill spawn/extension still outranks downgrade upgrade.
- [x] Capture `ticksToDowngrade` and `level` in runtime worker world.
- [x] Update integration tests for runtime capture and upgrade execution.
- [x] Update docs/game-state/development notes if live deploy happens.
- [x] Run focused tests.
- [x] Run `pnpm check`.
- [x] If approved, run `pnpm deploy:screeps` and `pnpm verify:live:screeps`.
- [x] Record live `ticksToDowngrade` readback or blocker.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/creeps/worker-decision.test.ts
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:bundle
pnpm check
pnpm test:screeps-server
```

## Risk Points

- Warning threshold too high can slow extension build; threshold too low risks downgrade.
- Refill must remain higher priority or workers may carry energy to controller while spawn/extension starves.
- Critical branch must not make empty workers attempt upgrade instead of harvesting.

## Parallelization

P0 implementation should be single-owner because it touches worker/runtime/integration files that P1-P4 also need. Research or docs can be delegated, but code integration should not be parallelized.
