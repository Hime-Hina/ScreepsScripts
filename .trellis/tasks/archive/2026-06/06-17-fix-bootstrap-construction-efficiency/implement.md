# Implementation Plan: Bootstrap construction efficiency

## Preflight

- [ ] Confirm clean `main` worktree.
- [ ] Create/switch branch `fix/bootstrap-construction-efficiency` from `origin/main`.
- [ ] Run focused current tests once if needed:
  - `pnpm vitest run test/unit/creeps/worker-decision.test.ts test/unit/construction/construction-planner.test.ts`

## Slice 1: Worker energy-mode RED tests

- [ ] Add failing tests in `test/unit/creeps/worker-decision.test.ts`:
  - partial-energy working worker continues building;
  - partial-energy harvesting worker continues harvesting;
  - empty working worker harvests;
  - full harvesting worker builds/refills according to current priority;
  - existing refill/downgrade/critical repair priority remains intact for working workers.
- [ ] If runtime memory capture is changed, add/update integration coverage in `test/integration/main-loop.test.ts` or the narrowest existing runtime-boundary test.
- [ ] Verify RED with focused test command.

## Slice 2: Worker energy-mode implementation

- [ ] Add `WorkerEnergyMode` and `energyMode` to `WorkerCreepSnapshot` in `src/creeps/worker-decision.ts`.
- [ ] Change `planBootstrapWorkerAction` to branch on `energyMode`, not raw `freeCapacity > 0`.
- [ ] Preserve current working-branch priority:
  1. refill underfilled spawn/extension;
  2. controller downgrade guard;
  3. critical supported repair;
  4. build construction;
  5. upgrade controller.
- [ ] Preserve current harvesting-branch priority:
  1. pickup dropped energy;
  2. withdraw available energy;
  3. harvest assigned source.
- [ ] Update runtime capture in `src/runtime/screeps-runtime.ts` to compute normalized mode from current carry state and prior `creep.memory.working`.
- [ ] Persist normalized mode in runtime-owned Screeps memory path, not in pure planner code.
- [ ] Run focused creep/runtime tests until GREEN.

## Slice 3: Road-frontier RED tests

- [ ] Add failing tests in `test/unit/construction/construction-planner.test.ts`:
  - source route road frontier comes before controller route;
  - road positions are emitted from source/container anchor toward spawn;
  - planner emits only a small frontier, not all missing road positions;
  - existing road sites/roads on the path are skipped and counted as part of the frontier;
  - high unrelated backlog does not add more scattered roads.
- [ ] Add failing tests in `test/unit/creeps/worker-decision.test.ts` for construction-site target priority if worker selection must change:
  - two workers assigned to different sources choose source-local construction targets;
  - assigned-source local work beats progressed equivalent source-side work on another source;
  - worker falls back to room-global construction priority when the assigned source has no local target.
- [ ] Verify RED.

## Slice 4: Road-frontier implementation

- [ ] Refactor `planRoadDecisions` / `limitLowPriorityRoadDecisions` in `src/construction/construction-planner.ts` to emit source-first route frontier decisions.
- [ ] Change route order to source anchors first, then controller anchor.
- [ ] Within each route, use anchor-to-spawn ordering.
- [ ] Keep new road site count small and deterministic.
- [ ] Ensure existing structures/sites on the intended path are skipped but influence frontier selection.
- [ ] If necessary, extend `WorkerConstructionSiteSnapshot` and runtime capture with `structureType`, `x`, `y`, and progress fields.
- [ ] Replace id-only construction-site selection with strategic deterministic ordering.
- [ ] Pass each worker's assigned source into construction-site selection and prefer assigned-source-local container/road targets before equivalent other-source work.
- [ ] Do not change source-adjacent container placement solely to avoid mining-slot loss; containers are walkable and may be used as miner standing tiles.
- [ ] Run focused construction and creep tests until GREEN.

## Slice 5: Documentation/spec updates

- [ ] Update `.trellis/spec/runtime/domain-boundaries.md` to replace the stale worker contract `free capacity -> harvest` with explicit energy-mode hysteresis.
- [ ] Update `docs/architecture.md` / `CONTEXT.md` if behavior summary changes.
- [ ] Record any live-backlog cleanup decision separately; do not imply cleanup happened unless it was explicitly executed and verified.

## Verification

- [ ] `pnpm vitest run test/unit/creeps/worker-decision.test.ts test/unit/construction/construction-planner.test.ts`
- [ ] Relevant integration test(s), if runtime memory capture changed.
- [ ] `pnpm check`
- [ ] `git diff --check`
- [ ] `python ./.trellis/scripts/task.py validate 06-17-fix-bootstrap-construction-efficiency`
- [ ] Independent Codex read-only review before merge if available.

## Deployment gate

Do not deploy in this implementation task unless explicitly authorized after code review. If authorized later:

- [ ] capture pre-deploy `pnpm status:live:screeps`;
- [ ] run `pnpm deploy:screeps`;
- [ ] verify readback/hash;
- [ ] monitor short window;
- [ ] decide whether existing scattered construction sites need explicit cleanup.
