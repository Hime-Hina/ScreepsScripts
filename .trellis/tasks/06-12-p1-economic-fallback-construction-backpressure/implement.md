# P1 economic fallback and construction backpressure implementation plan

## Checklist

- [ ] Confirm P0 controller downgrade guard is live or stop and create P0.
- [ ] Read parent PRD/design and current RCL2 economic contracts.
- [ ] Add unit test for construction deferred when economy is unsafe.
- [ ] Add pure planner support for construction eligibility.
- [ ] Add unit test for dropped energy before source harvest.
- [ ] Add `pickupEnergy` decision and runtime execution.
- [ ] Add unit test for tombstone/ruin/store withdraw before source harvest.
- [ ] Add `withdrawEnergy` decision and runtime execution.
- [ ] Add per-tick reservation tests for limited energy/build targets.
- [ ] Update integration and bundle tests for new Screeps constants.
- [ ] Update docs/game-state if deployed.
- [ ] Run focused unit/integration tests.
- [ ] Run `pnpm check`.
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

- Build throttling without P0 can still let controller downgrade.
- Pickup/withdraw target selection can create creep traffic; avoid pathfinding in P1.
- Stale tombstone/ruin IDs should fail loudly in tests, not silently fallback.

## Parallelization

Do not implement P1 runtime integration in parallel with P2/P3/P4. Pure worker planner tests can be delegated to a sub-agent only if runtime files remain untouched by others.
