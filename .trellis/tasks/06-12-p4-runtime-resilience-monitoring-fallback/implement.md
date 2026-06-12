# P4 runtime resilience and monitoring fallback implementation plan

## Checklist

- [ ] Confirm P0 and P1 survival signals exist.
- [ ] Add CPU snapshot capture to runtime interface.
- [ ] Add pure budget decision tests.
- [ ] Add kernel branch for survival-only budget.
- [ ] Add alert decision and throttling tests.
- [ ] Add runtime `Game.notify` execution with group interval.
- [ ] Add operation-group error boundary tests.
- [ ] Add read-only live survival check script or extend existing script.
- [ ] Add system tests for script contract and no default CI inclusion.
- [ ] Update docs/game-state and development docs.
- [ ] Run validation commands.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/kernel test/unit/runtime
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:system
pnpm check
pnpm verify:live:screeps
```

`verify:live:screeps` remains readback only. The new live survival check must be explicit and read-only.

## Risk Points

- Error isolation can hide real defects if logs are vague.
- Game.notify can spam if throttling is wrong.
- Low-bucket mode must never skip P0 controller upgrade or emergency spawn.

## Parallelization

Live-check script and CPU budget pure tests can be delegated. Kernel/runtime integration should be single-owner.
