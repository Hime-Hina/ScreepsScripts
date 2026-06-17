# Implementation Plan: Bootstrap RCL2 efficiency follow-ups

## Preflight

- [ ] Confirm branch/status and current live status.
- [ ] Start Trellis task `06-18-bootstrap-rcl2-efficiency-followups`.
- [ ] Keep existing parent task changes intact; do not deploy until all gates pass.

## Slice 1: room-level spawn energy

- [ ] Add/adjust integration test in `test/integration/main-loop.test.ts` where room total energy is 550/550 but spawn store is 300/300; expect 550 body.
- [ ] Verify RED.
- [ ] Change full and survival spawn runtime capture to use `spawn.room.energyAvailable` and `spawn.room.energyCapacityAvailable`.
- [ ] Run focused spawning/main-loop tests.

## Slice 2: multi-worker construction-site build concentration

- [ ] Replace the old one-worker-per-site test in `test/unit/creeps/worker-decision.test.ts` with a concentration test.
- [ ] Add/keep source-locality tests so assigned-source work is not defeated by pile-on.
- [ ] Verify RED.
- [ ] Replace `reservedConstructionSiteIds` with remaining-work reservation.
- [ ] Run focused worker tests.

## Slice 3: container withdrawals

- [ ] Add integration test where `FIND_STRUCTURES` returns a container with energy and `FIND_MY_STRUCTURES` does not include it; expect worker withdraw.
- [ ] Verify RED.
- [ ] Extend runtime withdrawal capture to include containers from `FIND_STRUCTURES`.
- [ ] Run focused integration/worker tests.

## Slice 4: target ordering cleanup

- [ ] Add worker unit tests proving id is only tie-breaker for refill, pickup, withdrawal, and repair.
- [ ] Extend worker snapshot types and runtime capture with `x/y` and type metadata.
- [ ] Implement strategy comparators with deterministic fallback.
- [ ] Run focused worker/main-loop tests.

## Slice 5: road backlog skip

- [ ] Add construction planner test for high backlog: container decisions may still be emitted but roads are skipped without relying on limiter output.
- [ ] Implement early exit before `planRoadDecisions`.
- [ ] Run focused construction tests.

## Slice 6: fake Screeps constants

- [ ] Update integration/e2e fake `FIND_*` constants to official values.
- [ ] Run integration and e2e tests.

## Documentation/specs

- [ ] Update `.trellis/spec/runtime/domain-boundaries.md` or relevant docs for room-level spawn energy, multi-builder construction reservation, and container withdrawals.
- [ ] Update `docs/architecture.md` / `CONTEXT.md` behavior summary.

## Verification

- [ ] Focused tests:
  - `pnpm vitest run test/unit/spawning/spawn-decision.test.ts test/unit/creeps/worker-decision.test.ts test/unit/construction/construction-planner.test.ts test/integration/main-loop.test.ts test/e2e/compiled-loop.test.ts`
- [ ] `pnpm check`
- [ ] `git diff --check`
- [ ] `python3 ./.trellis/scripts/task.py validate 06-18-bootstrap-rcl2-efficiency-followups`
- [ ] Bob local Codex CLI read-only review.
- [ ] Hermes sub-agent read-only review if useful.

## Deployment and finish

- [ ] Capture pre-deploy `pnpm status:live:screeps`.
- [ ] `pnpm deploy:screeps`.
- [ ] `pnpm verify:live:screeps`.
- [ ] Post-deploy `pnpm status:live:screeps`.
- [ ] Short monitor several samples.
- [ ] Commit verified changes.
- [ ] Finish/archive Trellis task as appropriate.
