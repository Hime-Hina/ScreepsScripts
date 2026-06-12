# RCL2 runtime integration and live verification implementation plan

## Checklist

- [x] Confirm worker energy-flow child is complete or patch is available.
- [x] Confirm extension planner child is complete or patch is available.
- [x] Read parent `prd.md`, `design.md`, and this child `design.md`.
- [x] Add failing integration test for `Room.createConstructionSite`.
- [x] Capture construction world snapshot and execute construction decisions.
- [x] Add failing integration test for refill extension/spawn through `refillEnergyStructure`.
- [x] Wire runtime refill execution to generic energy structure target.
- [x] Add failing integration test for `Creep.build` construction site.
- [x] Wire runtime build execution.
- [x] Update compiled loop/e2e expectations if action union changes.
- [x] Update docs for new RCL2 behavior.
- [x] Run `pnpm check`.
- [x] Run `pnpm test:screeps-server`.
- [x] If live deploy is approved, run `pnpm deploy:screeps` and `pnpm verify:live:screeps`.
- [x] Record live readback or blocked reason in `docs/game-state.md`.

## Validation

```powershell
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm check
pnpm test:screeps-server
pnpm deploy:screeps
pnpm verify:live:screeps
```

Live commands require explicit approval at execution time.

## Integration Handoff

Report:

- changed files
- local validation results
- live deploy/readback result or blocker
- docs updated

## Completed Handoff

- Changed files: `src/runtime/screeps-runtime.ts`, `src/kernel/run-tick.ts`, `test/integration/main-loop.test.ts`, `test/e2e/compiled-loop.test.ts`, docs.
- Local validation passed: `pnpm check`, `pnpm test:screeps-server`, focused unit/integration/bundle commands.
- Live deploy passed: branch `main`, module set hash `da64ae0bcfb5654642568b941e0aa6a578933fb0220ea417646979495865ae83`.
- Live room readback recorded in `docs/game-state.md`: 5 extension construction sites and builder progress at `36,23`.

## Rollback

- Before live deploy: revert runtime/kernel/integration/docs changes.
- After live deploy: run `pnpm rollback:screeps`, then `pnpm verify:live:screeps`.
