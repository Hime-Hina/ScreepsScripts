# P1 economic fallback and construction backpressure implementation plan

## Checklist

- [x] Confirm P0 controller downgrade guard is live or stop and create P0.
- [x] Read parent PRD/design and current RCL2 economic contracts.
- [x] Add unit test for stale top-level `Memory.creeps` cleanup.
- [x] Add integration test proving `loop()` deletes dead creep memory and preserves live creep memory.
- [x] Add memory-boundary cleanup operation without mixing top-level `Memory.creeps` into `Memory.screepsScripts`.
- [x] Add failing test showing spawn body cost uses captured `BODYPART_COST`, not a local duplicate table.
- [x] Add failing test showing RCL2 structure limits/build backlog use captured `CONTROLLER_STRUCTURES` and `CONSTRUCTION_COST`.
- [x] Add unit test for current survival floor: below `3` workers spawns emergency/bootstrap worker.
- [x] Replace hard-coded bootstrap cap `3` with explicit survival worker demand.
- [x] Add unit test for RCL2 construction expansion target: safe controller + stable refill + construction backlog allows spawning up to `5`.
- [x] Add unit test that non-safe controller downgrade state keeps target at survival floor `3`.
- [x] Add unit test that unstable spawn/extension energy keeps target at survival floor `3`.
- [x] Add unit test for construction deferred when economy is unsafe.
- [x] Add pure planner support for construction eligibility.
- [x] Add unit test for dropped energy before source harvest.
- [x] Add `pickupEnergy` decision and runtime execution.
- [x] Add unit test for tombstone/ruin/store withdraw before source harvest.
- [x] Add `withdrawEnergy` decision and runtime execution.
- [x] Add per-tick reservation tests for limited energy/build targets.
- [x] Update integration and bundle tests for new Screeps constants.
- [ ] Update docs/game-state if deployed.
- [x] Run focused unit/integration tests.
- [x] Run `pnpm check`.
- [ ] If approved, run `pnpm deploy:screeps` and `pnpm verify:live:screeps`.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/creeps/worker-decision.test.ts
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:bundle
pnpm check
pnpm test:screeps-server
```

## Risk Points

- `Memory.creeps` is top-level Screeps legacy memory; do not put it inside the project `screepsScripts` schema or reject it as an unknown project field.
- Runtime constants must be captured narrowly; strategy modules should not read Screeps globals directly.
- Raising worker target without economy gating can starve spawn/extension refill and slow P0 recovery.
- Build throttling without P0 can still let controller downgrade.
- Pickup/withdraw target selection can create creep traffic; avoid pathfinding in P1.
- Stale tombstone/ruin IDs should fail loudly in tests, not silently fallback.

## Parallelization

Do not implement P1 runtime integration in parallel with P2/P3/P4. Pure worker planner tests can be delegated to a sub-agent only if runtime files remain untouched by others.
