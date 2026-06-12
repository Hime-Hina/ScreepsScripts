# RCL2 economic infrastructure loop implementation plan

## Checklist

- [x] Finalize planning review and task scope.
- [x] Split parent into parallel-safe child tasks and record dependency boundaries.
- [x] Run `task.py start` only after user approves implementation.
- [x] Read `trellis-before-dev` and relevant runtime/testing/operations specs.
- [x] Slice 1: energy structure refill.
- [x] Slice 2: builder behavior.
- [x] Slice 3: extension construction planner.
- [x] Update integration/e2e tests for runtime boundary execution.
- [x] Update docs and game-state notes.
- [x] Run focused tests after each slice.
- [x] Run `pnpm check`.
- [x] Run `pnpm test:screeps-server`.
- [x] If approved, deploy live and verify readback.
- [x] Use `trellis-check`.
- [x] Use `trellis-update-spec` if new construction/runtime contracts are established.
- [ ] Commit work changes, archive task, record journal.

## Behavior Slices

## Parallelization Plan

Parallel-safe:

- `06-12-rcl2-worker-energy-flow-decisions`: pure worker decision and unit tests.
- `06-12-rcl2-extension-planner-decisions`: pure construction planner and unit tests.

Sequential after both:

- `06-12-rcl2-runtime-integration-live-verification`: runtime/kernel wiring, integration/e2e/docs/live deploy.

Do not assign two agents to edit `src/runtime/screeps-runtime.ts`, `src/kernel/run-tick.ts`, or `test/integration/main-loop.test.ts` at the same time.

### 1. Energy structure refill

Public interface: `planBootstrapWorkerActions`.

- Given worker has energy and same-room spawn/extension has free energy capacity.
- When worker action planning runs.
- Then worker returns one `refillEnergyStructure` decision targeting the first stable underfilled energy structure.
- Boundary: no Screeps globals, no extension special case in runtime strategy.

### 2. Builder behavior

Public interface: `planBootstrapWorkerActions`.

- Given worker has energy, all energy structures are full, and same-room construction sites exist.
- When worker action planning runs.
- Then worker builds a construction site before upgrading the controller.
- Boundary: no pathfinding; runtime handles out-of-range movement.

### 3. Extension construction planner

Public interface: new `planRoomConstruction`.

- Given owned RCL2 room has spawn and fewer than 5 extensions/sites.
- When construction planning runs.
- Then it returns deterministic `createConstructionSite` decisions for missing extensions.
- Boundary: planner uses snapshot positions and terrain/occupancy data; runtime executes `Room.createConstructionSite`.

### 4. Runtime preservation

Public interface: `runTick` / `captureScreepsTickRuntime`.

- Given one tick runs in Screeps globals stub.
- When construction and worker decisions are produced.
- Then runtime calls `createConstructionSite`, `transfer`, `build`, and existing harvest/upgrade APIs through boundary functions.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/creeps/worker-decision.test.ts
pnpm test:unit -- test/unit/construction
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm check
pnpm test:screeps-server
pnpm deploy:screeps
pnpm verify:live:screeps
```

`pnpm deploy:screeps` and `pnpm verify:live:screeps` run only after local gates pass and live deployment is explicitly approved.

## Validation Results

- `pnpm test:unit -- test/unit/creeps/worker-decision.test.ts test/unit/construction` passed.
- `pnpm test:integration -- test/integration/main-loop.test.ts` passed.
- `pnpm test:bundle` passed.
- `trellis-check` fixed missing kernel ordering regression coverage in `test/unit/kernel/run-tick.test.ts`.
- `pnpm check` passed: 13 files / 78 tests.
- `pnpm test:screeps-server` passed: smoke suite `basic-runtime-heartbeat,memory-schema-write`.
- `pnpm deploy:screeps` passed: branch `main`, module set hash `da64ae0bcfb5654642568b941e0aa6a578933fb0220ea417646979495865ae83`.
- `pnpm verify:live:screeps` passed: API readback matched local `main`.
- Live room readback found 5 extension construction sites and builder progress at `36,23` = `5/3000`.

## Risk Points

- Extension sites cost 3000 each; building all 5 is 15000 energy. Builder priority must not starve spawn/extension refill.
- Road/container/rampart construction is intentionally excluded; adding them now would require repair logic and broader energy budgeting.
- `Room.createConstructionSite` return codes should not be hidden by fallback logic. If runtime execution fails, tests should expose the missing snapshot guard or operational blocker.
- Replacing `refillSpawn` with `refillEnergyStructure` touches unit/integration/e2e expectations.

## Rollback Points

- After slice 1: revert worker refill action rename and tests.
- After slice 2: revert build action addition and runtime execution.
- After slice 3: revert construction planner and kernel integration.
- After live deploy: run `pnpm rollback:screeps`, then restore local source if needed.
